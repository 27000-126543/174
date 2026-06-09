import { useState, useEffect } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  HelpCircle,
  AlertTriangle,
  Eye,
  Shuffle,
  Shield,
  Calendar,
  Lock,
  BarChart3,
  TrendingUp,
  Bell,
  LogOut,
  Cross,
  Menu,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useMessageStore } from '@/store/messageStore'
import { ToastProvider } from '@/components/Toast'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  allowedRoles: UserRole[]
}

const navItems: NavItem[] = [
  { label: '工作台', path: '/dashboard', icon: LayoutDashboard, allowedRoles: ['sponsor', 'investigator', 'crc', 'dm', 'ec', 'subject'] },
  { label: '受试者管理', path: '/subjects', icon: Users, allowedRoles: ['investigator', 'crc', 'dm', 'sponsor'] },
  { label: 'CRF录入', path: '/crf', icon: FileText, allowedRoles: ['investigator', 'crc', 'dm'] },
  { label: '质疑管理', path: '/queries', icon: HelpCircle, allowedRoles: ['crc', 'dm', 'investigator'] },
  { label: '不良事件', path: '/sae', icon: AlertTriangle, allowedRoles: ['investigator', 'crc', 'dm', 'sponsor', 'ec'] },
  { label: '监查中心', path: '/monitoring', icon: Eye, allowedRoles: ['sponsor', 'dm'] },
  { label: '随机化', path: '/randomization', icon: Shuffle, allowedRoles: ['dm', 'investigator'] },
  { label: '伦理审查', path: '/ethics', icon: Shield, allowedRoles: ['ec', 'sponsor'] },
  { label: '访视管理', path: '/visits', icon: Calendar, allowedRoles: ['investigator', 'crc'] },
  { label: '数据锁定', path: '/data-lock', icon: Lock, allowedRoles: ['dm'] },
  { label: '统计报告', path: '/statistics', icon: BarChart3, allowedRoles: ['dm', 'sponsor'] },
  { label: '绩效报告', path: '/performance', icon: TrendingUp, allowedRoles: ['sponsor', 'dm'] },
  { label: '消息中心', path: '/messages', icon: Bell, allowedRoles: ['sponsor', 'investigator', 'crc', 'dm', 'ec', 'subject'] },
]

const roleLabels: Record<UserRole, string> = {
  sponsor: '申办方',
  investigator: '研究者',
  crc: 'CRC',
  dm: '数据管理员',
  ec: '伦理委员会',
  subject: '受试者',
}

function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    dashboard: '工作台',
    subjects: '受试者管理',
    enroll: '入组',
    consent: '知情同意',
    crf: 'CRF录入',
    queries: '质疑管理',
    sae: '不良事件',
    report: 'SAE报告',
    monitoring: '监查中心',
    randomization: '随机化',
    ethics: '伦理审查',
    visits: '访视管理',
    'data-lock': '数据锁定',
    statistics: '统计报告',
    performance: '绩效报告',
    messages: '消息中心',
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span>首页</span>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-2">
          <span>/</span>
          <span className={i === segments.length - 1 ? 'text-slate-800 font-medium' : ''}>
            {labels[seg] || seg}
          </span>
        </span>
      ))}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { unreadCount, fetchMessages } = useMessageStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const filteredNav = navItems.filter(
    (item) => user && item.allowedRoles.includes(user.role)
  )

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-[var(--border)] flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[var(--border)] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
            <Cross className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-teal-700">临床试验管理平台</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 border-l-[3px] border-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
              end={item.path === '/dashboard'}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border)] shrink-0">
          <div className="text-xs text-slate-400 text-center">v1.0.0</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Breadcrumb />
          </div>

          <div className="flex items-center gap-4">
            <NavLink to="/messages" className="relative text-slate-500 hover:text-teal-700 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="flex items-center gap-2 pl-4 border-l border-[var(--border)]">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-slate-800">{user?.name}</div>
                <div className="text-xs text-slate-400">{user ? roleLabels[user.role] : ''}</div>
              </div>
              <button
                onClick={logout}
                className="ml-2 text-slate-400 hover:text-red-500 transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </main>
      </div>
    </div>
  )
}
