import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, FileWarning, CheckCircle, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import type { SAEReport } from '@/types'

interface SAEItem extends SAEReport {
  subjectName?: string
}

const statusLabels: Record<string, string> = {
  reported: '已报告',
  under_review: '审查中',
  submitted: '已提交',
  closed: '已关闭',
}

const statusColors: Record<string, string> = {
  reported: 'bg-blue-50 text-blue-600',
  under_review: 'bg-amber-50 text-amber-600',
  submitted: 'bg-purple-50 text-purple-600',
  closed: 'bg-green-50 text-green-600',
}

const severityMap: Record<string, { label: string; color: string }> = {
  '危及生命': { label: '危及生命', color: 'bg-red-500' },
  '严重': { label: '严重', color: 'bg-amber-500' },
  '死亡': { label: '死亡', color: 'bg-red-700' },
}

const eventTypeLabels: Record<string, string> = {
  death: '死亡',
  life_threatening: '危及生命',
  hospitalization: '住院',
  disability: '致残',
  other_serious: '其他严重',
}

function getCountdown(deadline: string): { text: string; color: string; overdue: boolean } {
  const now = new Date().getTime()
  const dl = new Date(deadline).getTime()
  const diff = dl - now
  if (diff <= 0) {
    return { text: '已超期', color: 'text-red-600', overdue: true }
  }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours < 24) {
    return { text: `${hours}时${minutes}分`, color: 'text-amber-600', overdue: false }
  }
  return { text: `${hours}时${minutes}分`, color: 'text-green-600', overdue: false }
}

export default function SAEList() {
  const navigate = useNavigate()
  const [data, setData] = useState<SAEItem[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<SAEItem[]>('/sae')
        if (res.success && res.data) {
          setData(res.data)
        }
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [])

  const filtered = data.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false
    return true
  })

  const stats = [
    { label: '总报告数', value: data.length, icon: FileWarning, color: 'bg-slate-50 text-slate-700', border: 'border-l-slate-400' },
    { label: '审查中', value: data.filter((d) => d.status === 'under_review').length, icon: Clock, color: 'bg-amber-50 text-amber-600', border: 'border-l-amber-500' },
    { label: '已报告', value: data.filter((d) => d.status === 'reported').length, icon: AlertTriangle, color: 'bg-blue-50 text-blue-600', border: 'border-l-blue-500' },
    { label: '已关闭', value: data.filter((d) => d.status === 'closed').length, icon: CheckCircle, color: 'bg-green-50 text-green-600', border: 'border-l-green-500' },
  ]

  const statusTabs = [
    { key: 'all', label: '全部' },
    { key: 'reported', label: '已报告' },
    { key: 'under_review', label: '审查中' },
    { key: 'closed', label: '已关闭' },
  ]

  const severityLevels = [
    { key: 'all', label: '全部' },
    { key: '危及生命', label: '危及生命' },
    { key: '严重', label: '严重' },
    { key: '死亡', label: '死亡' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-red-600 rounded-full" />
          <h1 className="text-xl font-bold text-slate-800">严重不良事件</h1>
        </div>
        <button
          onClick={() => navigate('/sae/report')}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
        >
          <AlertTriangle className="w-4 h-4" />
          上报SAE
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-xl border border-[var(--border)] border-l-4 ${s.border} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-slate-500">严重程度:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            >
              {severityLevels.map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">SAE编号</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">受试者</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">事件类型</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">严重程度</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">状态</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">报告时间</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">截止时间</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">加载中...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">暂无数据</td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const countdown = getCountdown(item.deadline)
                  const sevInfo = severityMap[item.severity] || { label: item.severity, color: 'bg-slate-400' }
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        countdown.overdue ? 'bg-red-50/50' : ''
                      }`}
                      onClick={() => navigate(`/sae/${item.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">SAE-{item.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.subjectName || item.subjectId}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{eventTypeLabels[item.eventType] || item.eventType}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${sevInfo.color}`} />
                          <span className="text-sm text-slate-700">{sevInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-slate-100 text-slate-600'}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(item.reportDate).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-500">
                            {new Date(item.deadline).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-xs font-medium ${countdown.color}`}>
                            剩余 {countdown.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/sae/${item.id}`) }}
                          className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          查看
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
