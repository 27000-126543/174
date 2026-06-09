import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  FileText,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
  Clock,
  UserPlus,
  ClipboardList,
  AlertCircle,
  Download,
  ShieldAlert,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

const roleLabels: Record<string, string> = {
  sponsor: '申办方',
  investigator: '研究者',
  crc: 'CRC',
  dm: '数据管理员',
  ec: '伦理委员会',
  subject: '受试者',
}

const eventTypeLabels: Record<string, string> = {
  death: '死亡',
  life_threatening: '危及生命',
  hospitalization: '住院',
  disabling: '致残',
  congenital_anomaly: '先天异常',
  other_serious: '其他严重',
}

const statusLabels: Record<string, string> = {
  reported: '已报告',
  under_review: '审查中',
  submitted: '已提交',
  closed: '已关闭',
}

const stats = [
  { label: '受试者总数', value: '128', trend: '+12', trendUp: true, icon: Users, color: 'bg-teal-50 text-teal-700' },
  { label: '活跃CRF', value: '56', trend: '+8', trendUp: true, icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { label: '待处理质疑', value: '23', trend: '-5', trendUp: false, icon: HelpCircle, color: 'bg-amber-50 text-amber-600' },
  { label: 'SAE报告', value: '7', trend: '+2', trendUp: true, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
]

const recentActivities = [
  { time: '10分钟前', text: '受试者 S-2024-0128 完成入组筛选', type: 'enroll' },
  { time: '30分钟前', text: 'CRC 张伟 提交了访视3的CRF数据', type: 'crf' },
  { time: '1小时前', text: '新质疑 #Q-0456 已生成，待处理', type: 'query' },
  { time: '2小时前', text: 'SAE报告 #SAE-023 已提交伦理审查', type: 'sae' },
  { time: '3小时前', text: '受试者 S-2024-0125 签署知情同意书', type: 'consent' },
]

const upcomingVisits = [
  { subject: 'S-2024-0120', name: '王明', visit: '访视4', date: '2026-06-10', status: '计划中' },
  { subject: 'S-2024-0115', name: '李芳', visit: '访视6', date: '2026-06-11', status: '计划中' },
  { subject: 'S-2024-0128', name: '张磊', visit: '访视1', date: '2026-06-12', status: '待确认' },
]

const quickActions = [
  { label: '新增受试者', icon: UserPlus, path: '/subjects/enroll', color: 'bg-teal-700 hover:bg-teal-800' },
  { label: 'CRF录入', icon: ClipboardList, path: '/crf', color: 'bg-blue-600 hover:bg-blue-700' },
  { label: '提交质疑', icon: HelpCircle, path: '/queries', color: 'bg-amber-600 hover:bg-amber-700' },
  { label: 'SAE报告', icon: AlertCircle, path: '/sae/report', color: 'bg-red-600 hover:bg-red-700' },
]

const activityIcons: Record<string, string> = {
  enroll: 'bg-teal-100 text-teal-700',
  crf: 'bg-blue-100 text-blue-600',
  query: 'bg-amber-100 text-amber-600',
  sae: 'bg-red-100 text-red-600',
  consent: 'bg-purple-100 text-purple-600',
}

interface SAEItem {
  id: number
  subjectId: number
  trialId: number
  eventType: string
  description: string
  onsetDate: string
  reportDate: string
  deadline: string
  status: string
  subjectName?: string
  subjectCode?: string
  severity?: string
}

function getCountdown(deadline: string): { text: string; urgent: boolean; overdue: boolean; hours: number } {
  const now = new Date().getTime()
  const dl = new Date(deadline).getTime()
  const diff = dl - now
  if (diff <= 0) return { text: '已逾期', urgent: true, overdue: true, hours: 0 }
  const hours = diff / (1000 * 60 * 60)
  const days = Math.floor(hours / 24)
  const h = Math.floor(hours % 24)
  if (days > 0) return { text: `${days}天${h}时`, urgent: hours < 72, overdue: false, hours }
  return { text: `${h}小时`, urgent: true, overdue: false, hours }
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const isDM = user?.role === 'dm'
  const [saeList, setSaeList] = useState<SAEItem[]>([])
  const [saeLoading, setSaeLoading] = useState(false)
  const [regulatoryView, setRegulatoryView] = useState<'urgent' | 'normal' | 'all'>('all')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (isDM) {
      loadSAEData()
    }
  }, [isDM])

  const loadSAEData = async () => {
    setSaeLoading(true)
    try {
      const res = await api.get<any>('/sae')
      if (res.success && res.data) {
        setSaeList(res.data)
      }
    } catch {}
    setSaeLoading(false)
  }

  const handleDownloadCert = async (saeId: string) => {
    setDownloading(saeId)
    try {
      const res = await api.get<any>(`/sae/certificate/${saeId}`)
      if (res.success && res.data) {
        const c = res.data
        const lines = [
          '═══════════════════════════════════════════',
          '       严重不良事件(SAE)报告凭证',
          '═══════════════════════════════════════════',
          '',
          `凭证编号：${c.certificateId}`,
          `生成时间：${new Date(c.generatedAt).toLocaleString('zh-CN')}`,
          '',
          '─────── 基本信息 ───────',
          `试验名称：${c.trialName}`,
          `方案编号：${c.trialProtocol}`,
          `受试者编号：${c.subjectCode}`,
          `受试者姓名：${c.subjectName}`,
          '',
          '─────── 事件信息 ───────',
          `事件类型：${c.eventType}`,
          `严重程度：${c.severity || '未填写'}`,
          `因果关系：${c.causality || '未填写'}`,
          `事件描述：${c.description}`,
          '',
          '─────── 报告时限 ───────',
          `发生日期：${c.onsetDate}`,
          `报告日期：${c.reportDate}`,
          `截止日期：${c.deadline}`,
          `报告时限：${c.deadlineType}`,
          '',
          '─────── 报告人及状态 ───────',
          `报告人：${c.reporterName}`,
          `当前责任人：${c.assigneeName || '未指定'}`,
          `当前状态：${c.status}`,
          `监管状态：${c.regulatoryStatus || '待提交'}`,
          `下一步动作：${c.nextAction || '-'}`,
          '',
          '─────── 处理记录 ───────',
          ...(c.processingRecords || []).map((r: any, i: number) =>
            `  ${i + 1}. [${r.time}] ${r.action} - ${r.operator}${r.detail ? ` (${r.detail})` : ''}`
          ),
          '',
          ...(c.escalationRecords || []).length > 0 ? [
            '─────── 升级记录 ───────',
            ...(c.escalationRecords || []).map((r: any, i: number) =>
              `  ${i + 1}. [${r.time}] ${r.fromLevel} → ${r.toLevel}：${r.reason} (${r.operator})`
            ),
            '',
          ] : [],
          ...(c.materials || []).length > 0 ? [
            '─────── 说明材料 ───────',
            ...(c.materials || []).map((m: any, i: number) =>
              `  ${i + 1}. ${m.name}${m.description ? ` - ${m.description}` : ''} (上传于${m.uploadedAt})`
            ),
            '',
          ] : [],
          '─────── 通知对象 ───────',
          ...(c.notificationTargets || []).map((t: any) =>
            `  · ${t.target}：${t.detail}`
          ),
          '',
          '═══════════════════════════════════════════',
          '  本凭证由临床试验管理系统自动生成',
          '═══════════════════════════════════════════',
        ]
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${c.certificateId}.txt`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {}
    setDownloading(null)
  }

  const saeWithCountdown = useMemo(() => {
    return saeList
      .filter(s => s.status !== 'closed')
      .map(s => ({ ...s, countdown: getCountdown(s.deadline) }))
  }, [saeList])

  const urgentSAEs = saeWithCountdown.filter(s => s.eventType === 'death' || s.eventType === 'life_threatening')
  const normalSAEs = saeWithCountdown.filter(s => s.eventType !== 'death' && s.eventType !== 'life_threatening')

  const displaySAEs = useMemo(() => {
    if (regulatoryView === 'urgent') return urgentSAEs
    if (regulatoryView === 'normal') return normalSAEs
    return saeWithCountdown
  }, [regulatoryView, saeWithCountdown, urgentSAEs, normalSAEs])

  const overdueCount = saeWithCountdown.filter(s => s.countdown.overdue).length
  const approachingCount = saeWithCountdown.filter(s => !s.countdown.overdue && s.countdown.urgent).length

  if (isDM) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              监管工作台
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              当前角色：{user ? roleLabels[user.role] : ''} · 今日是2026年6月9日
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">待处理SAE</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{saeWithCountdown.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">24小时时限</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{urgentSAEs.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">15天时限</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{normalSAEs.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">逾期/临期</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  <span className="text-red-600">{overdueCount}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-amber-600">{approachingCount}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">SAE监管报告视图</h2>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { key: 'all' as const, label: '全部' },
                { key: 'urgent' as const, label: '24小时时限' },
                { key: 'normal' as const, label: '15天时限' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setRegulatoryView(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    regulatoryView === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {saeLoading ? (
            <div className="py-10 text-center text-slate-400 text-sm">加载中...</div>
          ) : displaySAEs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">暂无待处理SAE</div>
          ) : (
            <div className="space-y-3">
              {displaySAEs.map(sae => {
                const cd = sae.countdown
                const isUrgentType = sae.eventType === 'death' || sae.eventType === 'life_threatening'
                return (
                  <div
                    key={sae.id}
                    className={`rounded-xl border p-4 ${
                      cd.overdue
                        ? 'bg-red-50 border-red-200 border-l-4 border-l-red-600'
                        : cd.urgent
                        ? 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-500'
                        : 'bg-white border-[var(--border)] border-l-4 border-l-teal-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800">SAE-{sae.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            isUrgentType ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isUrgentType ? '24小时' : '15天'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            cd.overdue ? 'bg-red-100 text-red-700' : cd.urgent ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                          }`}>
                            {statusLabels[sae.status] || sae.status}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400">受试者：</span>
                            {sae.subjectCode || sae.subjectName || sae.subjectId}
                          </div>
                          <div>
                            <span className="text-slate-400">事件类型：</span>
                            {eventTypeLabels[sae.eventType] || sae.eventType}
                          </div>
                          <div>
                            <span className="text-slate-400">报告日期：</span>
                            {sae.reportDate}
                          </div>
                          <div>
                            <span className="text-slate-400">截止日期：</span>
                            {sae.deadline}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{sae.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className={`text-right ${
                          cd.overdue ? 'text-red-600' : cd.urgent ? 'text-amber-600' : 'text-teal-600'
                        }`}>
                          <p className="text-lg font-bold">{cd.text}</p>
                          <p className="text-xs">剩余时间</p>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            to={`/sae/${sae.id}`}
                            className="px-3 py-1.5 bg-teal-700 text-white text-xs rounded-lg hover:bg-teal-800 transition-colors"
                          >
                            查看详情
                          </Link>
                          <button
                            onClick={() => handleDownloadCert(String(sae.id))}
                            disabled={downloading === String(sae.id)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            凭证
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg text-white text-xs font-medium transition-colors ${action.color}`}
              >
                <action.icon className="w-5 h-5" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            欢迎回来，{user?.name || '用户'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            当前角色：{user ? roleLabels[user.role] : ''} · 今日是2026年6月9日
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs">
              {stat.trendUp ? (
                <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={stat.trendUp ? 'text-teal-600' : 'text-red-500'}>
                {stat.trend}
              </span>
              <span className="text-slate-400">较上周</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">最近活动</h2>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${activityIcons[act.type]}`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{act.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4">快捷操作</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.path}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg text-white text-xs font-medium transition-colors ${action.color}`}
                >
                  <action.icon className="w-5 h-5" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">即将到来访视</h2>
              <Link to="/visits" className="text-xs text-teal-700 hover:underline flex items-center gap-1">
                查看全部 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingVisits.map((v, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      {v.name} · {v.visit}
                    </p>
                    <p className="text-xs text-slate-400">{v.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    v.status === '计划中'
                      ? 'bg-teal-50 text-teal-700'
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
