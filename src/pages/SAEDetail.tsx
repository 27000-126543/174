import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Bell, X, ShieldCheck, ShieldX } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { SAEReport } from '@/types'

interface SAEDetailData extends SAEReport {
  subjectName?: string
  timeline?: TimelineEntry[]
  notifications?: NotificationEntry[]
}

interface TimelineEntry {
  status: string
  label: string
  timestamp: string | null
  active: boolean
}

interface NotificationEntry {
  id: string
  target: string
  message: string
  sentAt: string
}

const mockDetail: SAEDetailData = {
  id: 'SAE-001',
  subjectId: 'S-001',
  subjectName: '王明',
  eventType: '住院',
  description: '严重肝功能异常，ALT/AST升高至正常值上限5倍以上，伴黄疸',
  onsetDate: '2026-06-08T10:00:00',
  reportDate: '2026-06-08T11:00:00',
  severity: '3',
  causality: '可能有关',
  status: 'reviewing',
  deadline: '2026-06-23T11:00:00',
  timeline: [
    { status: 'reported', label: '已报告', timestamp: '2026-06-08T11:00:00', active: true },
    { status: 'reviewing', label: '审查中', timestamp: '2026-06-09T09:00:00', active: true },
    { status: 'closed', label: '已关闭', timestamp: null, active: false },
  ],
  notifications: [
    { id: 'n1', target: '伦理委员会', message: '新的SAE报告待审查：SAE-001', sentAt: '2026-06-08T11:01:00' },
    { id: 'n2', target: '申办方', message: '新SAE已上报，请关注：SAE-001', sentAt: '2026-06-08T11:01:00' },
    { id: 'n3', target: '监管机构', message: 'SAE通报：SAE-001 严重肝功能异常', sentAt: '2026-06-08T11:02:00' },
  ],
}

const severityLabels: Record<string, string> = {
  '1': '1级 - 轻度',
  '2': '2级 - 中度',
  '3': '3级 - 重度',
  '4': '4级 - 危及生命',
  '5': '5级 - 死亡',
}

function formatCountdown(deadline: string): { text: string; color: string; overdue: boolean } {
  const now = new Date().getTime()
  const dl = new Date(deadline).getTime()
  const diff = dl - now
  if (diff <= 0) return { text: '已超期', color: 'text-red-600', overdue: true }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return { text: `${days}天 ${hours}时 ${minutes}分`, color: 'text-green-600', overdue: false }
  if (hours < 24) return { text: `${hours}时 ${minutes}分`, color: 'text-amber-600', overdue: false }
  return { text: `${hours}时 ${minutes}分`, color: 'text-green-600', overdue: false }
}

export default function SAEDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [data, setData] = useState<SAEDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<SAEDetailData>(`/sae/${id}`)
        if (res.success && res.data) {
          setData(res.data)
        } else {
          setData(mockDetail)
        }
      } catch {
        setData(mockDetail)
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  const countdown = useMemo(() => {
    if (!data?.deadline) return null
    return formatCountdown(data.deadline)
  }, [data?.deadline])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await api.put(`/sae/${id}/status`, { status: newStatus })
      if (res.success && res.data) {
        setData(res.data as SAEDetailData)
      } else {
        setData((prev) => prev ? { ...prev, status: newStatus } : prev)
      }
    } catch {
      setData((prev) => prev ? { ...prev, status: newStatus } : prev)
    }
    setActionLoading(false)
    setShowRejectModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400">加载中...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400">未找到数据</p>
      </div>
    )
  }

  const isEC = user?.role === 'ec'
  const sev = parseInt(data.severity) || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/sae')}
          className="flex items-center gap-1 text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-red-600 rounded-full" />
        <h1 className="text-xl font-bold text-slate-800">SAE详情</h1>
        <span className="text-sm text-slate-500 ml-2">{data.id}</span>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] border-l-4 border-l-red-600 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">事件信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">受试者</p>
            <p className="text-sm font-medium text-slate-800">{data.subjectName || data.subjectId}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">事件类型</p>
            <p className="text-sm font-medium text-slate-800">{data.eventType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">严重程度</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${sev <= 2 ? 'bg-green-500' : sev === 3 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-slate-800">{severityLabels[data.severity] || data.severity}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">因果关系</p>
            <p className="text-sm font-medium text-slate-800">{data.causality}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">发生时间</p>
            <p className="text-sm font-medium text-slate-800">{new Date(data.onsetDate).toLocaleString('zh-CN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">报告时间</p>
            <p className="text-sm font-medium text-slate-800">{new Date(data.reportDate).toLocaleString('zh-CN')}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-xs text-slate-500 mb-1">事件描述</p>
            <p className="text-sm text-slate-700">{data.description}</p>
          </div>
        </div>
      </div>

      {countdown && (
        <div className={`rounded-xl border p-5 ${countdown.overdue ? 'bg-red-50 border-red-200' : 'bg-white border-[var(--border)]'}`}>
          <div className="flex items-center gap-3">
            <Clock className={`w-6 h-6 ${countdown.overdue ? 'text-red-600' : 'text-teal-700'}`} />
            <div>
              <p className="text-sm text-slate-500">报告截止时间</p>
              <p className={`text-2xl font-bold ${countdown.color}`}>
                {countdown.overdue ? '已超期' : countdown.text}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                截止：{new Date(data.deadline).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-base font-bold text-slate-800 mb-6">审查流程</h2>
        <div className="flex items-start gap-0">
          {(data.timeline || []).map((entry, i, arr) => (
            <div key={entry.status} className="flex-1 relative">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  entry.active
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {entry.active ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  )}
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 ${entry.active ? 'bg-teal-700' : 'bg-slate-200'}`} />
                )}
              </div>
              <p className={`text-sm font-medium ${entry.active ? 'text-teal-700' : 'text-slate-400'}`}>
                {entry.label}
              </p>
              {entry.timestamp && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(entry.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">推送通知记录</h2>
        <div className="space-y-3">
          {(data.notifications || []).map((n) => (
            <div key={n.id} className="flex items-start gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{n.target}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(n.sentAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isEC && data.status === 'reviewing' && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">审查操作</h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleStatusUpdate('closed')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              批准审查
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <ShieldX className="w-4 h-4" />
              驳回
            </button>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">驳回确认</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">确认驳回此SAE报告？</span>
              </div>
              <p className="text-sm text-slate-600">驳回后需重新提交报告，该操作不可撤销。</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={() => handleStatusUpdate('reported')}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
