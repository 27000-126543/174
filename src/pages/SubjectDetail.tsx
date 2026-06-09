import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  UserCheck,
  Phone,
  CreditCard,
  Calendar,
  FileText,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import type { Subject, Trial, CRFRecord, VisitRecord, SAEReport, Consent, SubjectStatus } from '@/types'

type TabKey = 'basic' | 'consent' | 'crf' | 'visits' | 'sae'

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'basic', label: '基本信息', icon: UserCheck },
  { key: 'consent', label: '知情同意', icon: FileText },
  { key: 'crf', label: 'CRF记录', icon: ClipboardList },
  { key: 'visits', label: '访视记录', icon: Calendar },
  { key: 'sae', label: '不良事件', icon: AlertTriangle },
]

const statusFlow: SubjectStatus[] = [
  'screening',
  'eligible',
  'consented',
  'randomized',
  'active',
  'completed',
]

const statusActionLabels: Record<string, string> = {
  screening: '标记为符合条件',
  eligible: '标记为已知情同意',
  consented: '执行随机化',
  randomized: '标记为在治',
  active: '标记为已完成',
}

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [trial, setTrial] = useState<Trial | null>(null)
  const [consent, setConsent] = useState<Consent | null>(null)
  const [crfRecords, setCrfRecords] = useState<CRFRecord[]>([])
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [saeReports, setSaeReports] = useState<SAEReport[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('basic')
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<Subject>(`/subjects/${id}`).then((res) => {
      if (res.success && res.data) {
        setSubject(res.data)
        if (res.data.trialId) {
          api.get<Trial>(`/trials/${res.data.trialId}`).then((r) => {
            if (r.success && r.data) setTrial(r.data)
          })
        }
      }
      setLoading(false)
    })

    api.get<Consent>(`/consent/${id}`).then((res) => {
      if (res.success && res.data) setConsent(res.data)
    })
    api.get<CRFRecord[]>(`/crf?subjectId=${id}`).then((res) => {
      if (res.success && res.data) setCrfRecords(res.data)
    })
    api.get<VisitRecord[]>(`/visits?subjectId=${id}`).then((res) => {
      if (res.success && res.data) setVisits(res.data)
    })
    api.get<SAEReport[]>(`/sae?subjectId=${id}`).then((res) => {
      if (res.success && res.data) setSaeReports(res.data)
    })
  }, [id])

  const handleAdvanceStatus = async () => {
    if (!subject || advancing) return
    setAdvancing(true)
    const currentIdx = statusFlow.indexOf(subject.status)
    if (currentIdx < 0 || currentIdx >= statusFlow.length - 1) {
      setAdvancing(false)
      return
    }
    const nextStatus = statusFlow[currentIdx + 1]
    const res = await api.put<Subject>(`/subjects/${subject.id}`, { status: nextStatus })
    if (res.success && res.data) {
      setSubject(res.data)
    }
    setAdvancing(false)
  }

  const canAdvance =
    subject && statusFlow.includes(subject.status) && subject.status !== 'completed'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <UserCheck className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500">未找到该受试者信息</p>
        <button
          onClick={() => navigate('/subjects')}
          className="mt-4 text-sm text-teal-700 hover:underline"
        >
          返回受试者列表
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/subjects')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{subject.name}</h1>
            <p className="text-sm text-slate-400">ID: {subject.id}</p>
          </div>
        </div>
        <StatusBadge status={subject.status} type="subject" />
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-400 mb-1">姓名</p>
            <p className="text-sm font-medium text-slate-800">{subject.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">性别</p>
            <p className="text-sm font-medium text-slate-800">{subject.gender}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">年龄</p>
            <p className="text-sm font-medium text-slate-800">{subject.age}岁</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400 mb-1">联系电话</p>
              <p className="text-sm font-medium text-slate-800">{subject.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400 mb-1">身份证号</p>
              <p className="text-sm font-medium text-slate-800">{subject.idNumber}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">试验项目</p>
            <p className="text-sm font-medium text-slate-800">
              {trial?.name || subject.trialId}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">随机号</p>
            <p className="text-sm font-medium text-slate-800">
              {subject.randomizationId || '—'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400 mb-1">报名日期</p>
              <p className="text-sm font-medium text-slate-800">
                {subject.screenResult ? '已登记' : '—'}
              </p>
            </div>
          </div>
        </div>

        {canAdvance && (
          <div className="mt-5 pt-5 border-t border-[var(--border)] flex items-center justify-end gap-3">
            <span className="text-sm text-slate-500">
              当前状态：<StatusBadge status={subject.status} type="subject" />
            </span>
            <button
              onClick={handleAdvanceStatus}
              disabled={advancing}
              className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60"
            >
              {advancing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              {statusActionLabels[subject.status] || '推进状态'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.key
                  ? 'text-teal-700 border-teal-700'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">详细信息</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {[
                  ['受试者ID', subject.id],
                  ['姓名', subject.name],
                  ['性别', subject.gender],
                  ['年龄', `${subject.age}岁`],
                  ['联系电话', subject.phone],
                  ['身份证号', subject.idNumber],
                  ['试验项目', trial?.name || subject.trialId],
                  ['中心ID', subject.siteId],
                  ['随机号', subject.randomizationId || '—'],
                  ['当前状态', null],
                ].map(([label, value], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 w-20 shrink-0">{label}</span>
                    {value !== null ? (
                      <span className="text-sm font-medium text-slate-800">{value}</span>
                    ) : (
                      <StatusBadge status={subject.status} type="subject" />
                    )}
                  </div>
                ))}
              </div>

              {subject.screenResult && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">筛选结果</h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">符合率：</span>
                      <span className={cn(
                        'font-bold',
                        subject.screenResult.eligible ? 'text-green-600' : 'text-red-600'
                      )}>
                        {Math.round(
                          (subject.screenResult.details.filter((d) => d.passed).length /
                            subject.screenResult.details.length) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    {subject.screenResult.details.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={d.passed ? 'text-green-500' : 'text-red-500'}>
                          {d.passed ? '✓' : '✗'}
                        </span>
                        <span className="text-slate-600">{d.criterion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'consent' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-700">知情同意状态</h3>
                <StatusBadge
                  status={
                    consent
                      ? consent.isLocked
                        ? 'locked'
                        : consent.subjectSignature && consent.investigatorSignature
                        ? 'signed'
                        : consent.subjectSignature || consent.investigatorSignature
                        ? 'partial'
                        : 'unsigned'
                      : 'unsigned'
                  }
                  type="consent"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">受试者签名</span>
                  <span className={consent?.subjectSignature ? 'text-green-600 font-medium' : 'text-slate-400'}>
                    {consent?.subjectSignature ? '已签署' : '未签署'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">研究者签名</span>
                  <span className={consent?.investigatorSignature ? 'text-green-600 font-medium' : 'text-slate-400'}>
                    {consent?.investigatorSignature ? '已签署' : '未签署'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">锁定状态</span>
                  <span className={consent?.isLocked ? 'text-teal-700 font-medium' : 'text-slate-400'}>
                    {consent?.isLocked ? '已锁定' : '未锁定'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/subjects/${id}/consent`)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  查看知情同意书
                </button>
              </div>
            </div>
          )}

          {activeTab === 'crf' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">CRF记录列表</h3>
              {crfRecords.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <ClipboardList className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">暂无CRF记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {crfRecords.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center">
                          <ClipboardList className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{r.module}</p>
                          <p className="text-xs text-slate-400">
                            访视: {r.visitId} · 更新: {r.updatedAt}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={r.status} type="crf" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">访视记录</h3>
              {visits.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">暂无访视记录</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />
                  {visits.map((v, i) => (
                    <div key={v.id} className="relative mb-4 last:mb-0">
                      <div
                        className={cn(
                          'absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2',
                          v.complianceStatus === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : v.complianceStatus === 'missed'
                            ? 'bg-red-500 border-red-500'
                            : v.complianceStatus === 'overdue'
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-white border-slate-300'
                        )}
                      />
                      <div className="bg-slate-50 rounded-lg p-3 ml-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{v.visitCycle}</span>
                          <StatusBadge status={v.complianceStatus} type="visit" />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>计划: {v.plannedDate}</span>
                          <span>实际: {v.actualDate || '—'}</span>
                          {v.reminderSent && (
                            <span className="text-amber-600">已提醒</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sae' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">不良事件报告</h3>
              {saeReports.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <AlertTriangle className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">暂无不良事件报告</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {saeReports.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/sae/${r.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{r.eventType}</p>
                          <p className="text-xs text-slate-400">
                            发生: {r.onsetDate} · 严重程度: {r.severity}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={r.status} type="sae" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
