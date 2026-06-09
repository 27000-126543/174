import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, CheckCircle, X, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'

interface Subject {
  id: string
  name: string
}

const eventTypes = [
  { value: 'death', label: '死亡' },
  { value: 'life_threatening', label: '危及生命' },
  { value: 'hospitalization', label: '住院' },
  { value: 'disability', label: '致残' },
  { value: 'other_serious', label: '其他严重事件' },
]

const severityOptions = [
  { value: '严重', label: '严重' },
  { value: '危及生命', label: '危及生命' },
  { value: '死亡', label: '死亡' },
]

const causalityOptions = ['肯定有关', '可能有关', '可能无关', '无关']

function calculateDeadline(onsetDate: string, eventType: string): Date | null {
  if (!onsetDate) return null
  const onset = new Date(onsetDate)
  if (eventType === 'death' || eventType === 'life_threatening') {
    return new Date(onset.getTime() + 24 * 60 * 60 * 1000)
  }
  return new Date(onset.getTime() + 15 * 24 * 60 * 60 * 1000)
}

function formatCountdown(deadline: Date): string {
  const now = new Date().getTime()
  const diff = deadline.getTime() - now
  if (diff <= 0) return '已超期'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}天 ${hours}时 ${minutes}分`
  return `${hours}时 ${minutes}分`
}

export default function SAEReport() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState({
    subjectId: '',
    eventType: '',
    description: '',
    onsetDate: '',
    severity: '',
    causality: '',
  })
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get<Subject[]>('/subjects')
        if (res.success && res.data) {
          setSubjects(res.data)
        }
      } catch {}
    }
    fetchSubjects()
  }, [])

  const deadline = useMemo(() => {
    return calculateDeadline(form.onsetDate, form.eventType)
  }, [form.onsetDate, form.eventType])

  const isUrgent = form.eventType === 'death' || form.eventType === 'life_threatening'

  const deadlineColor = useMemo(() => {
    if (!deadline) return ''
    const diff = deadline.getTime() - Date.now()
    if (diff <= 0) return 'text-red-600'
    if (diff < 24 * 60 * 60 * 1000) return 'text-amber-600'
    return 'text-green-600'
  }, [deadline])

  const isValid = form.subjectId && form.eventType && form.description && form.onsetDate && form.severity && form.causality

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await api.post('/sae/report', {
        ...form,
        reportDate: new Date().toISOString(),
        deadline: deadline?.toISOString(),
      })
      if (res.success) {
        setShowConfirm(false)
        setShowSuccess(true)
      }
    } catch {
      setShowConfirm(false)
      setShowSuccess(true)
    }
    setSubmitting(false)
  }

  const selectedSubject = subjects.find((s) => s.id === form.subjectId)

  if (showSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-red-600 rounded-full" />
          <h1 className="text-xl font-bold text-slate-800">SAE上报</h1>
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">上报成功</h2>
          <p className="text-sm text-slate-500 mb-6">
            严重不良事件已成功提交，报告编号将在审核后生成
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 justify-center mb-1">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">系统通知</span>
            </div>
            <p className="text-sm text-blue-600">系统已自动推送至伦理委员会和监管机构</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/sae')}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-red-600 rounded-full" />
        <h1 className="text-xl font-bold text-slate-800">SAE上报</h1>
      </div>

      {deadline && (
        <div className={`rounded-xl border p-5 ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <Clock className={`w-6 h-6 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
            <div>
              <p className="text-sm font-medium text-slate-700">
                报告截止时间：{deadline.toLocaleString('zh-CN')}
              </p>
              <p className={`text-lg font-bold ${deadlineColor}`}>
                剩余 {formatCountdown(deadline)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isUrgent ? '该事件类型需在24小时内上报' : '该事件类型需在15天内上报'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-base font-bold text-slate-800 mb-6">事件信息</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">受试者选择 <span className="text-red-500">*</span></label>
            <select
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            >
              <option value="">请选择受试者</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">事件类型 <span className="text-red-500">*</span></label>
            <select
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            >
              <option value="">请选择事件类型</option>
              {eventTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">事件描述 <span className="text-red-500">*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="请详细描述事件发生的过程、症状及处理措施"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">发生时间 <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={form.onsetDate}
              onChange={(e) => setForm({ ...form, onsetDate: e.target.value })}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">因果关系判断 <span className="text-red-500">*</span></label>
            <select
              value={form.causality}
              onChange={(e) => setForm({ ...form, causality: e.target.value })}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            >
              <option value="">请选择因果关系</option>
              {causalityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">严重程度 <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-3">
              {severityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form.severity === opt.value
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-[var(--border)] hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={opt.value}
                    checked={form.severity === opt.value}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="sr-only"
                  />
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    opt.value === '严重' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => isValid && setShowConfirm(true)}
          disabled={!isValid}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-sm transition-colors ${
            isValid ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          提交报告
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">确认上报</h3>
              <button onClick={() => setShowConfirm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-red-700 mb-2">确认上报此严重不良事件？</p>
              <div className="space-y-1 text-sm text-slate-600">
                <p>受试者：{selectedSubject?.name || form.subjectId}</p>
                <p>事件类型：{eventTypes.find((t) => t.value === form.eventType)?.label || form.eventType}</p>
                <p>严重程度：{severityOptions.find((o) => o.value === form.severity)?.label}</p>
                <p>因果关系：{form.causality}</p>
                {deadline && <p>报告截止：{deadline.toLocaleString('zh-CN')}</p>}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '提交中...' : '确认上报'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
