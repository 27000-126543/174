import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ShieldCheck, Eye, Edit3, FileText, AlertCircle, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import DataTable from '@/components/DataTable'
import type { Column } from '@/components/DataTable'
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

const moduleOptions = [
  { value: '', label: '全部模块' },
  { value: 'demographics', label: '人口学' },
  { value: 'vital_signs', label: '生命体征' },
  { value: 'lab_test', label: '实验室检查' },
  { value: 'concomitant_meds', label: '合并用药' },
  { value: 'adverse_events', label: '不良事件' },
]

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'submitted', label: '已提交' },
  { value: 'verified', label: '已核实' },
  { value: 'locked', label: '已锁定' },
]

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

export default function CRFList() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useToast()

  const [records, setRecords] = useState<ServerCRFRecord[]>([])
  const [subjects, setSubjects] = useState<ServerSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchSubject, setSearchSubject] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [validateModal, setValidateModal] = useState(false)
  const [validateResult, setValidateResult] = useState<ValidationResponse | null>(null)
  const [validating, setValidating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [crfRes, subRes] = await Promise.all([
        api.get<ServerCRFRecord[]>('/crf'),
        api.get<ServerSubject[]>('/subjects'),
      ])
      if (crfRes.success && crfRes.data) setRecords(crfRes.data)
      if (subRes.success && subRes.data) setSubjects(subRes.data)
    } catch {
      addToast('error', '获取CRF列表失败')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getSubjectName = (subjectId: number) => {
    const s = subjects.find((sub) => sub.id === subjectId)
    return s ? `${s.name}(${s.subjectCode})` : `受试者#${subjectId}`
  }

  const filtered = records.filter((r) => {
    if (filterModule && r.formType !== filterModule) return false
    if (filterStatus && r.status !== filterStatus) return false
    if (searchSubject) {
      const name = getSubjectName(r.subjectId).toLowerCase()
      if (!name.includes(searchSubject.toLowerCase())) return false
    }
    return true
  })

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleValidate = async (crfId: number) => {
    setValidating(true)
    setValidateModal(true)
    try {
      const res = await api.post<ValidationResponse>('/crf/validate', { crfId })
      if (res.success && res.data) {
        setValidateResult(res.data)
        fetchData()
      } else {
        addToast('error', res.error || '校验失败')
        setValidateModal(false)
      }
    } catch {
      addToast('error', '校验请求失败')
      setValidateModal(false)
    } finally {
      setValidating(false)
    }
  }

  const canEdit = user?.role === 'investigator' || user?.role === 'crc'

  const columns: Column<ServerCRFRecord>[] = [
    {
      key: 'id',
      title: 'CRF编号',
      width: '100px',
      render: (row) => <span className="font-mono text-teal-700">CRF-{String(row.id).padStart(4, '0')}</span>,
    },
    {
      key: 'subjectId',
      title: '受试者',
      render: (row) => getSubjectName(row.subjectId),
    },
    {
      key: 'visitId',
      title: '访视',
      width: '100px',
      render: (row) => `访视${row.visitId}`,
    },
    {
      key: 'formType',
      title: '模块',
      width: '120px',
      render: (row) => (
        <span className="status-badge status-badge--info">{moduleLabels[row.formType] || row.formType}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (row) => {
        const badge = statusBadge[row.status] || { label: row.status, cls: 'bg-slate-100 text-slate-600' }
        return <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
      },
    },
    {
      key: 'updatedAt',
      title: '最后更新',
      width: '160px',
      render: (row) => new Date(row.updatedAt).toLocaleString('zh-CN'),
    },
    {
      key: 'actions',
      title: '操作',
      width: '180px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/crf/${row.id}`) }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-teal-700 transition-colors"
            title="查看"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canEdit && row.status === 'draft' && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/crf/${row.id}`) }}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-teal-700 transition-colors"
              title="编辑"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {(canEdit || user?.role === 'dm') && (
            <button
              onClick={(e) => { e.stopPropagation(); handleValidate(row.id) }}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors"
              title="校验"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="病例报告表"
        icon={FileText}
        action={
          user?.role === 'investigator' ? (
            <button
              onClick={() => addToast('info', '新建CRF功能开发中')}
              className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新建CRF
            </button>
          ) : undefined
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchSubject}
              onChange={(e) => { setSearchSubject(e.target.value); setPage(1) }}
              placeholder="搜索受试者..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <select
            value={filterModule}
            onChange={(e) => { setFilterModule(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            {moduleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        onRowClick={(row) => navigate(`/crf/${row.id}`)}
        pagination={{
          page,
          pageSize,
          total: filtered.length,
          onChange: setPage,
        }}
        emptyText="暂无CRF记录"
      />

      <Modal
        isOpen={validateModal}
        onClose={() => { setValidateModal(false); setValidateResult(null) }}
        title="CRF校验结果"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setValidateModal(false); setValidateResult(null) }}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              关闭
            </button>
          </div>
        }
      >
        {validating ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-slate-500">正在校验...</span>
          </div>
        ) : validateResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{validateResult.criticalErrors}</div>
                <div className="text-xs text-red-500 mt-1">严重错误</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{validateResult.warnings}</div>
                <div className="text-xs text-amber-500 mt-1">警告</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{validateResult.generatedQueries}</div>
                <div className="text-xs text-blue-500 mt-1">自动生成质疑</div>
              </div>
            </div>

            {validateResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700">校验详情</h4>
                {validateResult.errors.map((err, i) => (
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
              </div>
            )}

            {validateResult.generatedQueries > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                已自动为 {validateResult.generatedQueries} 条严重错误生成质疑，CRC将收到通知。
              </div>
            )}

            {validateResult.errors.length === 0 && (
              <div className="text-center py-4 text-green-600">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">校验通过，未发现错误</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
