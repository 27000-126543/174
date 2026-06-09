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
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const roleLabels: Record<string, string> = {
  sponsor: '申办方',
  investigator: '研究者',
  crc: 'CRC',
  dm: '数据管理员',
  ec: '伦理委员会',
  subject: '受试者',
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

export default function Dashboard() {
  const { user } = useAuthStore()

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
