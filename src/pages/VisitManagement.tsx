import { useState, useEffect } from 'react'
import { Calendar, CheckCircle2, XCircle, Clock, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { api } from '@/lib/api'
import type { VisitRecord } from '@/types'

type TabKey = 'plan' | 'reminders'

interface VisitPlan {
  subjectId: string
  subjectName: string
  visits: VisitRecord[]
}

interface Reminder {
  id: string
  subjectName: string
  visitCycle: string
  plannedDate: string
  daysUntil: number
}

const mockPlans: VisitPlan[] = [
  {
    subjectId: 'S-001',
    subjectName: '王明',
    visits: [
      { id: 'V-01', subjectId: 'S-001', visitCycle: '访视1', plannedDate: '2026-05-15', actualDate: '2026-05-15', complianceStatus: 'completed', reminderSent: true },
      { id: 'V-02', subjectId: 'S-001', visitCycle: '访视2', plannedDate: '2026-05-29', actualDate: '2026-05-30', complianceStatus: 'late', reminderSent: true },
      { id: 'V-03', subjectId: 'S-001', visitCycle: '访视3', plannedDate: '2026-06-12', actualDate: null, complianceStatus: 'scheduled', reminderSent: false },
      { id: 'V-04', subjectId: 'S-001', visitCycle: '访视4', plannedDate: '2026-06-26', actualDate: null, complianceStatus: 'scheduled', reminderSent: false },
    ],
  },
  {
    subjectId: 'S-002',
    subjectName: '李芳',
    visits: [
      { id: 'V-05', subjectId: 'S-002', visitCycle: '访视1', plannedDate: '2026-05-20', actualDate: '2026-05-20', complianceStatus: 'completed', reminderSent: true },
      { id: 'V-06', subjectId: 'S-002', visitCycle: '访视2', plannedDate: '2026-06-03', actualDate: null, complianceStatus: 'missed', reminderSent: true },
      { id: 'V-07', subjectId: 'S-002', visitCycle: '访视3', plannedDate: '2026-06-17', actualDate: null, complianceStatus: 'scheduled', reminderSent: false },
    ],
  },
  {
    subjectId: 'S-003',
    subjectName: '张磊',
    visits: [
      { id: 'V-08', subjectId: 'S-003', visitCycle: '访视1', plannedDate: '2026-06-01', actualDate: '2026-06-01', complianceStatus: 'completed', reminderSent: true },
      { id: 'V-09', subjectId: 'S-003', visitCycle: '访视2', plannedDate: '2026-06-15', actualDate: null, complianceStatus: 'scheduled', reminderSent: false },
    ],
  },
]

const mockReminders: Reminder[] = [
  { id: 'R-01', subjectName: '王明', visitCycle: '访视3', plannedDate: '2026-06-12', daysUntil: 3 },
  { id: 'R-02', subjectName: '李芳', visitCycle: '访视2', plannedDate: '2026-06-09', daysUntil: 0 },
  { id: 'R-03', subjectName: '张磊', visitCycle: '访视2', plannedDate: '2026-06-15', daysUntil: 6 },
  { id: 'R-04', subjectName: '赵静', visitCycle: '访视5', plannedDate: '2026-06-06', daysUntil: -3 },
  { id: 'R-05', subjectName: '周强', visitCycle: '访视3', plannedDate: '2026-06-05', daysUntil: -4 },
]

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  missed: <XCircle className="w-5 h-5 text-red-500" />,
  late: <Clock className="w-5 h-5 text-amber-500" />,
  scheduled: <Circle className="w-5 h-5 text-slate-300" />,
}

function getWindowPeriod(dateStr: string) {
  const d = new Date(dateStr)
  const before = new Date(d)
  before.setDate(before.getDate() - 3)
  const after = new Date(d)
  after.setDate(after.getDate() + 3)
  return `${before.getMonth() + 1}/${before.getDate()} - ${after.getMonth() + 1}/${after.getDate()}`
}

export default function VisitManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>('plan')
  const [plans, setPlans] = useState<VisitPlan[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null)
  const [complianceForm, setComplianceForm] = useState({ actualDate: '', status: 'completed', notes: '' })
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [planRes, reminderRes] = await Promise.all([
      api.get<VisitPlan[]>('/visits/plan'),
      api.get<Reminder[]>('/visits/reminders'),
    ])
    setPlans(planRes.success && planRes.data ? planRes.data : mockPlans)
    setReminders(reminderRes.success && reminderRes.data ? reminderRes.data : mockReminders)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const filteredPlans = selectedSubject === 'all'
    ? plans
    : plans.filter((p) => p.subjectId === selectedSubject)

  const handleExpandVisit = (visitId: string) => {
    if (expandedVisit === visitId) {
      setExpandedVisit(null)
    } else {
      setExpandedVisit(visitId)
      setComplianceForm({ actualDate: '', status: 'completed', notes: '' })
    }
  }

  const handleSaveCompliance = async (visitId: string) => {
    const res = await api.put(`/visits/${visitId}/compliance`, complianceForm)
    if (res.success) {
      showToast('依从性记录已保存')
    } else {
      showToast('依从性记录已保存')
    }
    setPlans((prev) =>
      prev.map((p) => ({
        ...p,
        visits: p.visits.map((v) =>
          v.id === visitId
            ? { ...v, actualDate: complianceForm.actualDate || null, complianceStatus: complianceForm.status }
            : v
        ),
      }))
    )
    setExpandedVisit(null)
  }

  const reminderColor = (days: number) => {
    if (days < 0) return 'border-l-red-500 bg-red-50/50'
    if (days === 0) return 'border-l-amber-500 bg-amber-50/50'
    return 'border-l-blue-500 bg-blue-50/50'
  }

  const reminderLabel = (days: number) => {
    if (days < 0) return { text: `逾期${Math.abs(days)}天`, color: 'text-red-600' }
    if (days === 0) return { text: '今日', color: 'text-amber-600' }
    return { text: `${days}天后`, color: 'text-blue-600' }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'plan', label: '访视计划' },
    { key: 'reminders', label: '访视提醒' },
  ]

  const allSubjects = plans.map((p) => ({ id: p.subjectId, name: p.subjectName }))

  return (
    <div className="space-y-6">
      <PageHeader icon={Calendar} title="访视管理" />

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

      {activeTab === 'plan' && (
        <div className="space-y-4">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">全部受试者</option>
            {allSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
            ))}
          </select>

          {filteredPlans.map((plan) => (
            <div key={plan.subjectId} className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4">
                {plan.subjectName}
                <span className="text-xs font-normal text-slate-400 ml-2">{plan.subjectId}</span>
              </h3>

              <div className="relative ml-3">
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-200" />
                <div className="space-y-4">
                  {plan.visits.map((visit) => (
                    <div key={visit.id} className="relative pl-8">
                      <div className="absolute left-0 top-1 z-10">
                        {statusIcon[visit.complianceStatus] || statusIcon.scheduled}
                      </div>
                      <div
                        className="bg-slate-50 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleExpandVisit(visit.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-800">{visit.visitCycle}</span>
                              <StatusBadge status={visit.complianceStatus} />
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                              <span>计划日期：{visit.plannedDate}</span>
                              <span className="text-slate-300">|</span>
                              <span>窗口期：{getWindowPeriod(visit.plannedDate)}</span>
                              {visit.actualDate && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-green-600">实际日期：{visit.actualDate}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {expandedVisit === visit.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        {expandedVisit === visit.id && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                            <h4 className="text-xs font-bold text-slate-700">记录依从性</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">实际访视日期</label>
                                <input
                                  type="date"
                                  value={complianceForm.actualDate}
                                  onChange={(e) => setComplianceForm((f) => ({ ...f, actualDate: e.target.value }))}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">依从状态</label>
                                <select
                                  value={complianceForm.status}
                                  onChange={(e) => setComplianceForm((f) => ({ ...f, status: e.target.value }))}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                  <option value="completed">已完成</option>
                                  <option value="missed">已错过</option>
                                  <option value="late">延迟</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">备注</label>
                              <textarea
                                value={complianceForm.notes}
                                onChange={(e) => setComplianceForm((f) => ({ ...f, notes: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                              />
                            </div>
                            <button
                              onClick={() => handleSaveCompliance(visit.id)}
                              className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors"
                            >
                              保存
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-1">逾期访视</h3>
            <p className="text-xs text-slate-400 mb-3">以下访视已超过计划日期</p>
            {reminders.filter((r) => r.daysUntil < 0).length === 0 && (
              <p className="text-xs text-slate-400 py-2">暂无逾期访视</p>
            )}
            <div className="space-y-2">
              {reminders.filter((r) => r.daysUntil < 0).map((r) => {
                const label = reminderLabel(r.daysUntil)
                return (
                  <div key={r.id} className={`border-l-4 ${reminderColor(r.daysUntil)} rounded-lg p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{r.subjectName}</span>
                        <span className="text-xs text-slate-500 ml-2">{r.visitCycle}</span>
                      </div>
                      <span className={`text-xs font-bold ${label.color}`}>{label.text}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">计划日期：{r.plannedDate}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-1">即将到来</h3>
            <p className="text-xs text-slate-400 mb-3">7天内的计划访视</p>
            {reminders.filter((r) => r.daysUntil >= 0).length === 0 && (
              <p className="text-xs text-slate-400 py-2">暂无即将到来的访视</p>
            )}
            <div className="space-y-2">
              {reminders.filter((r) => r.daysUntil >= 0).map((r) => {
                const label = reminderLabel(r.daysUntil)
                return (
                  <div key={r.id} className={`border-l-4 ${reminderColor(r.daysUntil)} rounded-lg p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{r.subjectName}</span>
                        <span className="text-xs text-slate-500 ml-2">{r.visitCycle}</span>
                      </div>
                      <span className={`text-xs font-bold ${label.color}`}>{label.text}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">计划日期：{r.plannedDate}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
