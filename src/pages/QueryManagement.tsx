import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HelpCircle, ChevronDown, ChevronUp, Search, MessageSquare,
  XCircle, Filter, Send,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import DataTable from '@/components/DataTable'
import type { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'

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

interface ServerCRFRecord {
  id: number
  subjectId: number
  trialId: number
  visitId: number
  formType: string
  data: Record<string, any>
  status: string
  errors: { field: string; message: string; severity: 'error' | 'warning' }[]
  createdAt: string
  updatedAt: string
}

const statusTabs = [
  { value: '', label: '全部' },
  { value: 'open', label: '待处理' },
  { value: 'answered', label: '已回复' },
  { value: 'closed', label: '已关闭' },
]

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'logic_error', label: '逻辑错误' },
  { value: 'range_exceed', label: '范围超限' },
  { value: 'data_missing', label: '数据缺失' },
  { value: 'date_inconsistent', label: '日期不一致' },
]

const queryTypeMap: Record<string, { label: string; cls: string }> = {
  logic_error: { label: '逻辑错误', cls: 'bg-red-50 text-red-700 border-red-200' },
  range_exceed: { label: '范围超限', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  data_missing: { label: '数据缺失', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  date_inconsistent: { label: '日期不一致', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const queryStatusBadge: Record<string, { label: string; cls: string }> = {
  open: { label: '待处理', cls: 'bg-amber-50 text-amber-700' },
  answered: { label: '已回复', cls: 'bg-blue-50 text-blue-700' },
  closed: { label: '已关闭', cls: 'bg-slate-100 text-slate-600' },
}

function inferQueryType(question: string): string {
  if (/超出|范围|偏高|偏低|血压|心率|体温/.test(question)) return 'range_exceed'
  if (/缺失|补充|必填|请填/.test(question)) return 'data_missing'
  if (/日期|时间|不一致/.test(question)) return 'date_inconsistent'
  return 'logic_error'
}

export default function QueryManagement() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useToast()

  const [queries, setQueries] = useState<ServerQuery[]>([])
  const [crfRecords, setCRFRecords] = useState<ServerCRFRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCRF, setFilterCRF] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({})

  const [batchModal, setBatchModal] = useState(false)
  const [batchReplyText, setBatchReplyText] = useState('')
  const [batchAction, setBatchAction] = useState<'reply' | 'close' | null>(null)
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [qRes, crfRes] = await Promise.all([
        api.get<ServerQuery[]>('/crf/queries'),
        api.get<ServerCRFRecord[]>('/crf'),
      ])
      if (qRes.success && qRes.data) setQueries(qRes.data)
      if (crfRes.success && crfRes.data) setCRFRecords(crfRes.data)
    } catch {
      addToast('error', '获取质疑列表失败')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = queries.filter((q) => {
    if (filterStatus && q.status !== filterStatus) return false
    if (filterType && inferQueryType(q.question) !== filterType) return false
    if (filterCRF && String(q.crfId) !== filterCRF) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const stats = {
    open: queries.filter((q) => q.status === 'open').length,
    answered: queries.filter((q) => q.status === 'answered').length,
    closed: queries.filter((q) => q.status === 'closed').length,
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map((q) => q.id)))
    }
  }

  const handleSingleReply = async (queryId: number) => {
    const reply = replyTexts[queryId]
    if (!reply?.trim()) {
      addToast('warning', '请输入回复内容')
      return
    }
    try {
      const res = await api.put(`/crf/queries/${queryId}`, { answer: reply })
      if (res.success) {
        addToast('success', '回复成功')
        setReplyTexts((prev) => {
          const next = { ...prev }
          delete next[queryId]
          return next
        })
        fetchData()
      } else {
        addToast('error', res.error || '回复失败')
      }
    } catch {
      addToast('error', '回复请求失败')
    }
  }

  const handleCloseQuery = async (queryId: number) => {
    try {
      const res = await api.put(`/crf/queries/${queryId}`, { action: 'close' })
      if (res.success) {
        addToast('success', '质疑已关闭')
        fetchData()
      } else {
        addToast('error', res.error || '关闭失败')
      }
    } catch {
      addToast('error', '关闭请求失败')
    }
  }

  const handleBatchAction = async () => {
    if (selectedIds.size === 0) {
      addToast('warning', '请先选择质疑')
      return
    }
    setProcessing(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await api.post('/crf/queries/batch', {
        queryIds: ids,
        action: batchAction === 'reply' ? 'answer' : 'close',
        answer: batchAction === 'reply' ? batchReplyText : undefined,
      })
      if (res.success) {
        addToast('success', `批量${batchAction === 'reply' ? '回复' : '关闭'}成功`)
        setSelectedIds(new Set())
        setBatchModal(false)
        setBatchReplyText('')
        fetchData()
      } else {
        addToast('error', res.error || '批量操作失败')
      }
    } catch {
      addToast('error', '批量操作请求失败')
    } finally {
      setProcessing(false)
    }
  }

  const canReply = user?.role === 'crc' || user?.role === 'investigator'
  const canClose = user?.role === 'dm'

  const crfOptions = Array.from(new Set(queries.map((q) => q.crfId))).map((id) => ({
    value: String(id),
    label: `CRF-${String(id).padStart(4, '0')}`,
  }))

  const columns: Column<ServerQuery>[] = [
    {
      key: 'select',
      title: '',
      width: '40px',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(row.id) }}
          className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
        />
      ),
    },
    {
      key: 'id',
      title: '质疑编号',
      width: '110px',
      render: (row) => <span className="font-mono text-slate-700">Q-{String(row.id).padStart(4, '0')}</span>,
    },
    {
      key: 'crfId',
      title: 'CRF编号',
      width: '110px',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/crf/${row.crfId}`) }}
          className="font-mono text-teal-700 hover:text-teal-800 hover:underline"
        >
          CRF-{String(row.crfId).padStart(4, '0')}
        </button>
      ),
    },
    {
      key: 'type',
      title: '类型',
      width: '110px',
      render: (row) => {
        const type = inferQueryType(row.question)
        const t = queryTypeMap[type]
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${t.cls}`}>
            {t.label}
          </span>
        )
      },
    },
    {
      key: 'question',
      title: '描述',
      render: (row) => (
        <span className="text-sm text-slate-700 line-clamp-2">{row.question}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (row) => {
        const badge = queryStatusBadge[row.status] || { label: row.status, cls: 'bg-slate-100 text-slate-600' }
        return <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
      },
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: '150px',
      render: (row) => new Date(row.createdAt).toLocaleString('zh-CN'),
    },
    {
      key: 'expand',
      title: '',
      width: '40px',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(row.id) }}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors"
        >
          {expandedIds.has(row.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="质疑管理" icon={HelpCircle} />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{stats.open}</div>
            <div className="text-xs text-slate-500">待处理</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.answered}</div>
            <div className="text-xs text-slate-500">已回复</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-600">{stats.closed}</div>
            <div className="text-xs text-slate-500">已关闭</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setFilterStatus(tab.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === tab.value
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filterCRF}
            onChange={(e) => { setFilterCRF(e.target.value); setPage(1) }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">全部CRF</option>
            {crfOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-teal-50 rounded-xl border border-teal-200 p-3 flex items-center justify-between">
          <span className="text-sm text-teal-700">
            已选择 <strong>{selectedIds.size}</strong> 条质疑
          </span>
          <div className="flex items-center gap-2">
            {canReply && (
              <button
                onClick={() => { setBatchAction('reply'); setBatchModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                批量回复
              </button>
            )}
            {canClose && (
              <button
                onClick={() => { setBatchAction('close'); setBatchModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                批量关闭
              </button>
            )}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        pagination={{
          page,
          pageSize,
          total: filtered.length,
          onChange: setPage,
        }}
        emptyText="暂无质疑记录"
      />

      {expandedIds.size > 0 && (
        <div className="space-y-3">
          {paginated
            .filter((q) => expandedIds.has(q.id))
            .map((q) => (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-teal-700">Q-{String(q.id).padStart(4, '0')}</span>
                    <span className={`status-badge ${queryStatusBadge[q.status]?.cls || ''}`}>
                      {queryStatusBadge[q.status]?.label || q.status}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    收起
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">质疑描述</div>
                    <p className="text-sm text-slate-800">{q.question}</p>
                  </div>
                  {q.answer && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">回复内容</div>
                      <p className="text-sm text-slate-600 pl-3 border-l-2 border-teal-200">{q.answer}</p>
                      {q.answeredAt && (
                        <p className="text-xs text-slate-400 mt-1">
                          回复于 {new Date(q.answeredAt).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  )}
                  {q.status !== 'closed' && (
                    <div className="space-y-3">
                      {canReply && q.status === 'open' && (
                        <div>
                          <textarea
                            value={replyTexts[q.id] || ''}
                            onChange={(e) => setReplyTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="输入回复内容..."
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleSingleReply(q.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              回复
                            </button>
                          </div>
                        </div>
                      )}
                      {canClose && (
                        <button
                          onClick={() => handleCloseQuery(q.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          关闭质疑
                        </button>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                    创建于 {new Date(q.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <Modal
        isOpen={batchModal}
        onClose={() => { setBatchModal(false); setBatchReplyText('') }}
        title={batchAction === 'reply' ? '批量回复' : '批量关闭'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBatchModal(false); setBatchReplyText('') }}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleBatchAction}
              disabled={processing || (batchAction === 'reply' && !batchReplyText.trim())}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {processing ? '处理中...' : batchAction === 'reply' ? '确认回复' : '确认关闭'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            将对 <strong>{selectedIds.size}</strong> 条质疑执行{batchAction === 'reply' ? '回复' : '关闭'}操作
          </p>
          {batchAction === 'reply' && (
            <textarea
              value={batchReplyText}
              onChange={(e) => setBatchReplyText(e.target.value)}
              placeholder="输入统一回复内容，将应用到所有选中的质疑..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
            />
          )}
          {batchAction === 'close' && (
            <p className="text-sm text-amber-600">
              关闭后质疑将不再显示为待处理状态，请确认所有质疑已妥善处理。
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
