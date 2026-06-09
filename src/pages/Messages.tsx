import { useState, useEffect } from 'react'
import { Bell, FileText, HelpCircle, AlertTriangle, Lock, Download, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'
import { useMessageStore } from '@/store/messageStore'
import type { Message } from '@/types'

type FilterKey = 'all' | 'unread' | 'consent' | 'query' | 'sae' | 'datalock' | 'other'

interface MessageTypeConfig {
  icon: React.ReactNode
  color: string
  bgColor: string
  path: string
}

const typeConfig: Record<string, MessageTypeConfig> = {
  consent: { icon: <FileText className="w-4 h-4" />, color: 'text-teal-700', bgColor: 'bg-teal-50', path: '/subjects' },
  query: { icon: <HelpCircle className="w-4 h-4" />, color: 'text-amber-600', bgColor: 'bg-amber-50', path: '/queries' },
  sae: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500', bgColor: 'bg-red-50', path: '/sae' },
  datalock: { icon: <Lock className="w-4 h-4" />, color: 'text-purple-600', bgColor: 'bg-purple-50', path: '/data-lock' },
  other: { icon: <Bell className="w-4 h-4" />, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '' },
}

const typeToFilter: Record<string, FilterKey> = {
  consent: 'consent',
  query: 'query',
  sae: 'sae',
  datalock: 'datalock',
  other: 'other',
}

const mockMessages: Message[] = [
  { id: '1', userId: 'U-01', type: 'consent', title: '知情同意书签署提醒', content: '受试者王明（S-2024-0128）已完成知情同意书签署，请及时审核确认。签署时间：2026-06-09 10:30。', isRead: false, certificateUrl: '/certs/consent-001.pdf', createdAt: '2026-06-09T10:35:00' },
  { id: '2', userId: 'U-01', type: 'query', title: '新质疑待处理', content: 'CRF记录 #CRF-0456 产生新质疑：访视3血压数据异常，请核实并回复。质疑编号：Q-0456', isRead: false, certificateUrl: null, createdAt: '2026-06-09T09:20:00' },
  { id: '3', userId: 'U-01', type: 'sae', title: 'SAE报告提交提醒', content: '受试者张磊（S-2024-0125）发生严重不良事件，请尽快完成SAE报告上报。事件类型：严重低血糖，发生日期：2026-06-08。', isRead: false, certificateUrl: null, createdAt: '2026-06-08T16:00:00' },
  { id: '4', userId: 'U-01', type: 'datalock', title: '数据锁定通知', content: '试验T-001的数据已于2026-06-08 14:30被锁定，锁定范围：全部试验数据。锁定人：数据管理员 陈华。', isRead: true, certificateUrl: null, createdAt: '2026-06-08T14:30:00' },
  { id: '5', userId: 'U-01', type: 'consent', title: '知情同意书签署确认', content: '受试者李芳（S-2024-0115）知情同意书已审核通过。', isRead: true, certificateUrl: '/certs/consent-002.pdf', createdAt: '2026-06-07T11:00:00' },
  { id: '6', userId: 'U-01', type: 'query', title: '质疑回复提醒', content: '质疑 #Q-0452 已有新回复，请查看。回复人：CRC 张伟，回复内容：已核实，数据无误。', isRead: false, certificateUrl: null, createdAt: '2026-06-07T09:45:00' },
  { id: '7', userId: 'U-01', type: 'other', title: '系统维护通知', content: '系统将于2026年6月10日凌晨2:00-4:00进行维护升级，届时系统将不可用，请提前安排工作。', isRead: true, certificateUrl: null, createdAt: '2026-06-06T15:00:00' },
]

function timeAgo(dateStr: string): string {
  const now = new Date('2026-06-09T12:00:00')
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'consent', label: '知情签署' },
  { key: 'query', label: '质疑处理' },
  { key: 'sae', label: 'SAE上报' },
  { key: 'datalock', label: '数据锁定' },
  { key: 'other', label: '其他' },
]

export default function Messages() {
  const { messages, fetchMessages, markAsRead, unreadCount } = useMessageStore()
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    await fetchMessages()
    const res = await api.get<Message[]>('/messages')
    if (res.success && res.data) {
      setLocalMessages(res.data)
    } else {
      setLocalMessages(mockMessages)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const displayMessages = (messages.length > 0 ? messages : localMessages)

  const filtered = displayMessages.filter((m) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !m.isRead
    return typeToFilter[m.type] === filter
  })

  const currentUnreadCount = displayMessages.filter((m) => !m.isRead).length

  const handleExpand = async (msg: Message) => {
    if (expandedId === msg.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(msg.id)
    if (!msg.isRead) {
      await markAsRead(msg.id)
      setLocalMessages((prev) =>
        prev.map((m) => m.id === msg.id ? { ...m, isRead: true } : m)
      )
    }
  }

  const handleMarkAllRead = async () => {
    for (const m of displayMessages.filter((m) => !m.isRead)) {
      await markAsRead(m.id)
    }
    setLocalMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
    showToast('已全部标记为已读')
  }

  const handleDownloadCert = (url: string) => {
    showToast('凭证下载中...')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="消息中心"
        action={
          <div className="flex items-center gap-3">
            {currentUnreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full">
                {currentUnreadCount}条未读
              </span>
            )}
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              全部标记已读
            </button>
          </div>
        }
      />

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-[var(--border)] p-8 text-center text-slate-400 text-sm">
            暂无消息
          </div>
        )}
        {filtered.map((msg) => {
          const config = typeConfig[msg.type] || typeConfig.other
          const isExpanded = expandedId === msg.id

          return (
            <div
              key={msg.id}
              className={`bg-white rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow ${
                !msg.isRead ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => handleExpand(msg)}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor} ${config.color}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!msg.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <span className={`text-sm ${!msg.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-700'} truncate`}>
                      {msg.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{msg.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(msg.createdAt)}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                )}
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">{msg.content}</p>
                  <div className="flex items-center gap-3">
                    {config.path && (
                      <a
                        href={config.path}
                        className="px-3 py-1.5 bg-teal-700 text-white text-xs rounded-lg hover:bg-teal-800 transition-colors"
                      >
                        查看详情
                      </a>
                    )}
                    {msg.certificateUrl && (
                      <button
                        onClick={() => handleDownloadCert(msg.certificateUrl!)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        下载凭证
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
