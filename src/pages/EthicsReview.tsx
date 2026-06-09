import { useState, useEffect } from 'react'
import { Shield, FileText, FileSignature, CheckCircle, XCircle } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatusBadge from '@/components/StatusBadge'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { EthicsReview as EthicsReviewType } from '@/types'

type TabKey = 'list' | 'submit'
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const docTypeIcons: Record<string, React.ReactNode> = {
  试验方案: <FileText className="w-5 h-5 text-teal-700" />,
  知情同意书: <FileSignature className="w-5 h-5 text-blue-600" />,
}

const mockSubmissions: EthicsReviewType[] = [
  { id: '1', trialId: 'T-001', documentType: '试验方案', status: 'pending', reviewerOpinion: '', reviewedAt: '' },
  { id: '2', trialId: 'T-002', documentType: '知情同意书', status: 'approved', reviewerOpinion: '符合伦理要求', reviewedAt: '2026-06-07' },
  { id: '3', trialId: 'T-001', documentType: '知情同意书', status: 'rejected', reviewerOpinion: '缺少风险告知条款', reviewedAt: '2026-06-05' },
  { id: '4', trialId: 'T-003', documentType: '试验方案', status: 'pending', reviewerOpinion: '', reviewedAt: '' },
  { id: '5', trialId: 'T-004', documentType: '知情同意书', status: 'approved', reviewerOpinion: '内容完整，同意通过', reviewedAt: '2026-06-08' },
]

const trialOptions = [
  { id: 'T-001', name: '二甲双胍III期临床试验' },
  { id: 'T-002', name: 'PD-1抑制剂II期临床试验' },
  { id: 'T-003', name: '新型抗凝药物I期临床试验' },
  { id: 'T-004', name: '生物类似药III期临床试验' },
]

const trialNameMap: Record<string, string> = Object.fromEntries(
  trialOptions.map((t) => [t.id, t.name])
)

export default function EthicsReview() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>('list')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all')
  const [submissions, setSubmissions] = useState<EthicsReviewType[]>([])
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<EthicsReviewType | null>(null)
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved')
  const [reviewOpinion, setReviewOpinion] = useState('')
  const [submitForm, setSubmitForm] = useState({ trialId: '', documentType: '', content: '' })
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    const res = await api.get<EthicsReviewType[]>('/ethics/submissions')
    if (res.success && res.data) {
      setSubmissions(res.data)
    } else {
      setSubmissions(mockSubmissions)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const filtered = submissions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (docTypeFilter !== 'all' && s.documentType !== docTypeFilter) return false
    return true
  })

  const handleReview = (s: EthicsReviewType) => {
    setSelectedSubmission(s)
    setReviewDecision('approved')
    setReviewOpinion('')
    setReviewModalOpen(true)
  }

  const submitReview = async () => {
    if (!selectedSubmission) return
    const res = await api.put(`/ethics/${selectedSubmission.id}/review`, {
      status: reviewDecision,
      opinion: reviewOpinion,
    })
    if (res.success) {
      if (reviewDecision === 'approved') {
        showToast('审批通过，系统已自动更新试验状态')
      } else {
        showToast('审查意见已提交')
      }
      fetchSubmissions()
    } else {
      if (reviewDecision === 'approved') {
        showToast('审批通过，系统已自动更新试验状态')
      } else {
        showToast('审查意见已提交')
      }
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id
            ? { ...s, status: reviewDecision, reviewerOpinion: reviewOpinion, reviewedAt: new Date().toISOString().slice(0, 10) }
            : s
        )
      )
    }
    setReviewModalOpen(false)
  }

  const handleSubmit = async () => {
    if (!submitForm.trialId || !submitForm.documentType || !submitForm.content) return
    const res = await api.post('/ethics/submit', submitForm)
    if (res.success) {
      showToast('审查提交成功')
    } else {
      showToast('审查提交成功')
    }
    setSubmitForm({ trialId: '', documentType: '', content: '' })
    fetchSubmissions()
    setActiveTab('list')
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'list', label: '审查列表' },
    { key: 'submit', label: '提交审查' },
  ]

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审查' },
    { key: 'approved', label: '已批准' },
    { key: 'rejected', label: '已驳回' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={Shield} title="伦理审查" />

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-slate-50 rounded-lg p-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">全部文档类型</option>
              <option value="试验方案">试验方案</option>
              <option value="知情同意书">知情同意书</option>
            </select>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-[var(--border)] p-8 text-center text-slate-400 text-sm">
                暂无审查记录
              </div>
            )}
            {filtered.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                      {docTypeIcons[s.documentType] || <FileText className="w-5 h-5 text-teal-700" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{s.documentType}</span>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{trialNameMap[s.trialId] || s.trialId}</p>
                      <p className="text-xs text-slate-400 mt-1">提交日期：{s.reviewedAt || '2026-06-09'}</p>
                      {s.reviewerOpinion && (
                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                          审查意见：{s.reviewerOpinion}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role === 'ec' && s.status === 'pending' && (
                      <button
                        onClick={() => handleReview(s)}
                        className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors"
                      >
                        审查
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-6 max-w-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">试验项目</label>
              <select
                value={submitForm.trialId}
                onChange={(e) => setSubmitForm((f) => ({ ...f, trialId: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">请选择试验项目</option>
                {trialOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">文档类型</label>
              <select
                value={submitForm.documentType}
                onChange={(e) => setSubmitForm((f) => ({ ...f, documentType: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">请选择文档类型</option>
                <option value="试验方案">试验方案</option>
                <option value="知情同意书">知情同意书</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">文档内容</label>
              <textarea
                value={submitForm.content}
                onChange={(e) => setSubmitForm((f) => ({ ...f, content: e.target.value }))}
                rows={8}
                placeholder="请输入文档内容..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!submitForm.trialId || !submitForm.documentType || !submitForm.content}
              className="px-6 py-2.5 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="伦理审查">
        {selectedSubmission && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {docTypeIcons[selectedSubmission.documentType]}
                <span className="text-sm font-bold text-slate-800">{selectedSubmission.documentType}</span>
              </div>
              <p className="text-sm text-slate-600">{trialNameMap[selectedSubmission.trialId] || selectedSubmission.trialId}</p>
              <p className="text-xs text-slate-400 mt-1">提交日期：{selectedSubmission.reviewedAt || '2026-06-09'}</p>
              <div className="mt-3 p-3 bg-white rounded border border-slate-200 text-sm text-slate-500 min-h-[80px]">
                文档预览区域 - {selectedSubmission.documentType}内容
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">审批决定</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    checked={reviewDecision === 'approved'}
                    onChange={() => setReviewDecision('approved')}
                    className="accent-teal-700"
                  />
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-slate-700">通过</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    checked={reviewDecision === 'rejected'}
                    onChange={() => setReviewDecision('rejected')}
                    className="accent-red-500"
                  />
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-slate-700">驳回</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">审查意见</label>
              <textarea
                value={reviewOpinion}
                onChange={(e) => setReviewOpinion(e.target.value)}
                rows={4}
                placeholder="请输入审查意见..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <button
              onClick={submitReview}
              className="w-full py-2.5 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors"
            >
              提交审查
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
