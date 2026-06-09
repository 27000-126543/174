import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cross } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

const quickRoles: { role: UserRole; label: string; username: string }[] = [
  { role: 'sponsor', label: '申办方', username: 'sponsor1' },
  { role: 'investigator', label: '研究者', username: 'investigator1' },
  { role: 'crc', label: 'CRC', username: 'crc1' },
  { role: 'dm', label: '数据管理员', username: 'dm1' },
  { role: 'ec', label: '伦理委员会', username: 'ec1' },
  { role: 'subject', label: '受试者', username: 'subject1' },
]

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (role: typeof quickRoles[number]) => {
    setUsername(role.username)
    setPassword('123456')
    setError('')
    setLoading(true)
    try {
      await login(role.username, '123456')
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-teal-700 flex items-center justify-center mb-4">
              <Cross className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">临床试验管理平台</h1>
            <p className="text-sm text-slate-400 mt-1">Clinical Trial Management Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                placeholder="请输入密码"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-medium rounded-lg text-sm transition-colors"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-xs text-slate-400 mb-3 text-center">快速登录（演示模式）</div>
            <div className="grid grid-cols-3 gap-2">
              {quickRoles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => handleQuickLogin(r)}
                  disabled={loading}
                  className="px-2 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors disabled:opacity-50"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
