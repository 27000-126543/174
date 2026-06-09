import { useState, useEffect } from 'react'
import { Bell, FileText, HelpCircle, AlertTriangle, Lock, Download, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
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
  data_lock: 'datalock',
  datalock: 'datalock',
  system: 'other',
  visit: 'other',
  ethics: 'other',
  performance: 'other',
  randomization: 'other',
}

function timeAgo(dateStr: string): string {
  const now = new Date()
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
  const { messages, fetchMessages, markAsRead, markAllRead, unreadCount } = useMessageStore()
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const res = await api.get<any>('/messages')
      if (res.success && res.data) {
        const items = res.data.items || res.data
        const mapped: Message[] = (Array.isArray(items) ? items : []).map((m: any) => ({
          id: String(m.id),
          userId: String(m.userId),
          type: m.type === 'data_lock' ? 'datalock' : ['system', 'visit', 'ethics', 'performance', 'randomization'].includes(m.type) ? 'other' : m.type,
          title: m.title || '',
          content: m.content || '',
          isRead: !!m.read,
          certificateUrl: (m.type === 'sae' && m.relatedId) ? `/api/sae/certificate/${m.relatedId}` : null,
          createdAt: m.createdAt || '',
          relatedId: m.relatedId ? String(m.relatedId) : null,
        } as any))
        setLocalMessages(mapped)
      }
    } catch {}
    await fetchMessages()
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
    try {
      await markAllRead()
      setLocalMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
      showToast('已全部标记为已读')
    } catch {
      showToast('操作失败')
    }
  }

  const handleDownloadSaeCert = async (saeId: string) => {
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
        showToast('凭证下载成功')
      }
    } catch {
      showToast('凭证下载失败')
    }
  }

  const handleDownloadCert = async (msg: Message) => {
    const saeId = (msg as any).relatedId
    if (!saeId) {
      showToast('无关联SAE记录')
      return
    }
    await handleDownloadSaeCert(String(saeId))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="消息中心"
        action={
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full">
                {unreadCount}条未读
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
                    {msg.type === 'sae' && msg.certificateUrl && (
                      <>
                        <a
                          href={`/sae/${(msg as any).relatedId || ''}`}
                          className="px-3 py-1.5 bg-teal-700 text-white text-xs rounded-lg hover:bg-teal-800 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          查看SAE详情
                        </a>
                        <button
                          onClick={() => (msg as any).relatedId && handleDownloadSaeCert(String((msg as any).relatedId))}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          下载SAE凭证
                        </button>
                      </>
                    )}
                    {msg.type !== 'sae' && config.path && (
                      <a
                        href={config.path}
                        className="px-3 py-1.5 bg-teal-700 text-white text-xs rounded-lg hover:bg-teal-800 transition-colors"
                      >
                        查看详情
                      </a>
                    )}
                    {msg.type !== 'sae' && msg.certificateUrl && (
                      <button
                        onClick={() => handleDownloadCert(msg)}
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
