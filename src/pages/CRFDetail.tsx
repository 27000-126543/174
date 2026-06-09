import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Send, ShieldCheck, FileSpreadsheet,
  AlertCircle, AlertTriangle, HelpCircle, ChevronDown,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

interface ServerCRFRecord {
  id: number
  subjectId: number
  trialId: number
  visitId: number
  formType: string
  data: Record<string, any>
  status: 'draft' | 'submitted' | 'verified' | 'locked'
  errors: { field: string; message: string; severity: 'error' | 'warning' }[]
  createdAt: string
  updatedAt: string
  queries?: ServerQuery[]
}

interface ServerQuery {
  id: number
  crfId: number
  subjectId: number
  trialId: number
  question: string
  answer?: string
  status: 'open' | 'answered' | 'closed'
  createdBy: number
  answeredBy?: number
  createdAt: string
  answeredAt?: string
}

interface ServerSubject {
  id: number
  subjectCode: string
  name: string
}

interface ValidationResponse {
  crfId: number
  errors: { field: string; message: string; severity: 'error' | 'warning' }[]
  errorCount: number
  criticalErrors: number
  warnings: number
  generatedQueries: number
  queries: any[]
}

const moduleLabels: Record<string, string> = {
  demographics: '人口学',
  vital_signs: '生命体征',
  lab_test: '实验室检查',
  concomitant_meds: '合并用药',
  adverse_events: '不良事件',
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-amber-50 text-amber-700' },
  submitted: { label: '已提交', cls: 'bg-blue-50 text-blue-700' },
  verified: { label: '已核实', cls: 'bg-teal-50 text-teal-700' },
  locked: { label: '已锁定', cls: 'bg-slate-100 text-slate-600' },
}

const queryStatusBadge: Record<string, { label: string; cls: string }> = {
  open: { label: '待处理', cls: 'bg-amber-50 text-amber-700' },
  answered: { label: '已回复', cls: 'bg-blue-50 text-blue-700' },
  closed: { label: '已关闭', cls: 'bg-slate-100 text-slate-600' },
}

interface VitalSignsField {
  key: string
  label: string
  unit: string
  min: number
  max: number
  type: 'number' | 'date' | 'text'
}

const vitalSignsFields: VitalSignsField[] = [
  { key: 'temperature', label: '体温', unit: '°C', min: 35, max: 42, type: 'number' },
  { key: 'sbp', label: '收缩压', unit: 'mmHg', min: 60, max: 250, type: 'number' },
  { key: 'dbp', label: '舒张压', unit: 'mmHg', min: 40, max: 150, type: 'number' },
  { key: 'heartRate', label: '心率', unit: 'bpm', min: 30, max: 200, type: 'number' },
  { key: 'respiratoryRate', label: '呼吸频率', unit: '次/分', min: 8, max: 40, type: 'number' },
  { key: 'weight', label: '体重', unit: 'kg', min: 20, max: 300, type: 'number' },
  { key: 'height', label: '身高', unit: 'cm', min: 50, max: 250, type: 'number' },
  { key: 'visitDate', label: '记录日期', unit: '', min: 0, max: 0, type: 'date' },
  { key: 'recorder', label: '记录人', unit: '', min: 0, max: 0, type: 'text' },
]

export default function CRFDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useToast()

  const [crf, setCrf] = useState<ServerCRFRecord | null>(null)
  const [subject, setSubject] = useState<ServerSubject | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [validationResults, setValidationResults] = useState<ValidationResponse | null>(null)
  const [validating, setValidating] = useState(false)
  const [showValidationPanel, setShowValidationPanel] = useState(false)

  const [confirmQueryModal, setConfirmQueryModal] = useState(false)

  const fetchCRF = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await api.get<ServerCRFRecord>(`/crf/${id}`)
      if (res.success && res.data) {
        setCrf(res.data)
        setFormData({ ...res.data.data })
        if (!res.data.data.recorder && user?.name) {
          setFormData((prev) => ({ ...prev, recorder: user.name }))
        }
        const subRes = await api.get<ServerSubject[]>(`/subjects`)
        if (subRes.success && subRes.data) {
          const s = subRes.data.find((sub) => sub.id === res.data!.subjectId)
          if (s) setSubject(s)
        }
      } else {
        addToast('error', '获取CRF详情失败')
        navigate('/crf')
      }
    } catch {
      addToast('error', '获取CRF详情失败')
      navigate('/crf')
    } finally {
      setLoading(false)
    }
  }, [id, user?.name, addToast, navigate])

  useEffect(() => {
    fetchCRF()
  }, [fetchCRF])

  const validateField = (key: string, value: any) => {
    const errors: Record<string, string> = {}
    if (key === 'visitDate' && !value) {
      errors[key] = '记录日期为必填项'
    }
    const field = vitalSignsFields.find((f) => f.key === key)
    if (field && field.type === 'number' && value !== undefined && value !== '') {
      const num = Number(value)
      if (isNaN(num)) {
        errors[key] = `请输入有效数字`
      } else if (num < field.min || num > field.max) {
        errors[key] = `${field.label}应在${field.min}-${field.max}${field.unit}范围内`
      }
    }
    if (key === 'dbp' && value && formData.sbp && Number(value) >= Number(formData.sbp)) {
      errors[key] = '舒张压应小于收缩压'
    }
    if (key === 'sbp' && value && formData.dbp && Number(formData.dbp) >= Number(value)) {
      errors.dbp = '舒张压应小于收缩压'
    } else if (key === 'sbp' && value && formData.dbp && Number(formData.dbp) < Number(value)) {
      const dbpErrors = { ...fieldErrors }
      delete dbpErrors.dbp
      setFieldErrors(dbpErrors)
    }
    return errors
  }

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    const errors = validateField(key, value)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      if (key === 'sbp') delete next.dbp
      return { ...next, ...errors }
    })
  }

  const getBMI = () => {
    const w = Number(formData.weight)
    const h = Number(formData.height)
    if (w && h && h > 0) {
      const bmi = w / ((h / 100) ** 2)
      return bmi.toFixed(1)
    }
    return null
  }

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (!id) return
    if (Object.keys(fieldErrors).length > 0) {
      addToast('warning', '请修正表单中的错误后再保存')
      return
    }
    setSaving(true)
    try {
      const res = await api.post<ServerCRFRecord>(`/crf/${id}/save`, {
        data: formData,
        status,
      })
      if (res.success) {
        addToast('success', status === 'draft' ? '草稿已保存' : 'CRF已提交')
        fetchCRF()
      } else {
        addToast('error', res.error || '保存失败')
      }
    } catch {
      addToast('error', '保存请求失败')
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    if (!id) return
    setValidating(true)
    setShowValidationPanel(true)
    try {
      const res = await api.post<ValidationResponse>('/crf/validate', { crfId: Number(id) })
      if (res.success && res.data) {
        setValidationResults(res.data)
        if (res.data.criticalErrors > 0) {
          setConfirmQueryModal(true)
        }
      } else {
        addToast('error', res.error || '校验失败')
      }
    } catch {
      addToast('error', '校验请求失败')
    } finally {
      setValidating(false)
    }
  }

  const isLocked = crf?.status === 'locked' || crf?.status === 'verified'
  const bmi = getBMI()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-6" />
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-3 gap-4">
                <div className="h-10 bg-slate-200 rounded" />
                <div className="h-10 bg-slate-200 rounded" />
                <div className="h-10 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!crf) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/crf')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <PageHeader
            title={`CRF-${String(crf.id).padStart(4, '0')}`}
            subtitle={`${subject?.name || ''} · ${moduleLabels[crf.formType] || crf.formType} · 访视${crf.visitId}`}
            icon={FileSpreadsheet}
          />
        </div>
        <span className={`status-badge ${statusBadge[crf.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
          {statusBadge[crf.status]?.label || crf.status}
        </span>
      </div>

      {crf.formType === 'vital_signs' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-medium text-slate-800">生命体征</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vitalSignsFields.map((field) => {
                const hasError = !!fieldErrors[field.key]
                if (field.type === 'date') {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="date"
                        value={formData[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        disabled={isLocked}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400 ${
                          hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                        }`}
                      />
                      {hasError && (
                        <p className="mt-1 text-xs text-red-500">{fieldErrors[field.key]}</p>
                      )}
                    </div>
                  )
                }
                if (field.type === 'text') {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={formData[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        disabled={isLocked}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                  )
                }
                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label} {field.unit && <span className="text-slate-400 font-normal">({field.unit})</span>}
                    </label>
                    <input
                      type="number"
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      disabled={isLocked}
                      placeholder={`${field.min}-${field.max}`}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400 ${
                        hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                    />
                    {hasError && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors[field.key]}</p>
                    )}
                  </div>
                )
              })}
              {bmi && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    BMI <span className="text-slate-400 font-normal">(kg/m²)</span>
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600">
                    {bmi}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isLocked && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                保存草稿
              </button>
              <button
                onClick={() => handleSave('submitted')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                提交
              </button>
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                校验
              </button>
            </div>
          )}
        </div>
      )}

      {crf.formType !== 'vital_signs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-center text-slate-400 py-8">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3" />
            <p>{moduleLabels[crf.formType] || crf.formType}模块表单开发中</p>
          </div>
          {!isLocked && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                保存草稿
              </button>
              <button
                onClick={() => handleSave('submitted')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                提交
              </button>
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                校验
              </button>
            </div>
          )}
        </div>
      )}

      {showValidationPanel && (
        <div className="bg-white rounded-xl border border-slate-200">
          <button
            onClick={() => setShowValidationPanel(!showValidationPanel)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <span className="font-medium text-slate-800">校验结果</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showValidationPanel ? 'rotate-180' : ''}`} />
          </button>
          {showValidationPanel && (
            <div className="px-6 pb-4 space-y-3">
              {validating ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-slate-500">正在校验...</span>
                </div>
              ) : validationResults ? (
                <>
                  {validationResults.errors.length > 0 ? (
                    <div className="space-y-2">
                      {validationResults.errors.map((err, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                            err.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {err.severity === 'error' ? (
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          )}
                          <span>{err.message}</span>
                        </div>
                      ))}
                      {validationResults.generatedQueries > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                          已自动生成 {validationResults.generatedQueries} 条质疑
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-green-600">
                      <ShieldCheck className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-sm font-medium">校验通过</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">点击"校验"按钮开始校验</p>
              )}
            </div>
          )}
        </div>
      )}

      {crf.queries && crf.queries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <h3 className="font-medium text-slate-800">相关质疑 ({crf.queries.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {crf.queries.map((q) => (
              <div key={q.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{q.question}</p>
                    {q.answer && (
                      <p className="text-sm text-slate-500 mt-1 pl-3 border-l-2 border-teal-200">
                        回复：{q.answer}
                      </p>
                    )}
                  </div>
                  <span className={`status-badge shrink-0 ${queryStatusBadge[q.status]?.cls || ''}`}>
                    {queryStatusBadge[q.status]?.label || q.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {new Date(q.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmQueryModal}
        onClose={() => setConfirmQueryModal(false)}
        title="自动生成质疑确认"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmQueryModal(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              关闭
            </button>
            <button
              onClick={() => { setConfirmQueryModal(false); addToast('success', '质疑已自动生成') }}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
            >
              确认
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            校验发现 {validationResults?.criticalErrors || 0} 条严重错误，系统已自动生成对应质疑。
          </p>
          <p className="text-sm text-slate-500">
            CRC将收到质疑通知并需要及时回复。
          </p>
        </div>
      </Modal>
    </div>
  )
}
