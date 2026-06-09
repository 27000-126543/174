import { useState, useEffect } from 'react'
import { Download, Lock, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface LockInfo {
  trialId: number
  trialName: string
  lockedBy: number
  lockedByName: string
  lockedAt: string
  reason: string
  status: string
  subjectCount: number
  crfCompletionRate: number
  openQueries: number
  closedQueries: number
  totalQueries: number
  saeCount: number
  openSAEs: number
  closedSAEs: number
  saeSummary: { eventType: string; label: string; count: number }[]
  unresolvedItems: { type: string; description: string; id: number }[]
}

const eventTypeLabels: Record<string, string> = {
  death: '死亡', life_threatening: '危及生命',
  hospitalization: '住院', disabling: '致残',
  congenital_anomaly: '先天异常', other_serious: '其他严重',
}

export default function DataLockReview() {
  const { user } = useAuthStore()
  const [lockInfo, setLockInfo] = useState<LockInfo[]>([])
  const [selectedTrial, setSelectedTrial] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchLockData()
  }, [])

  const fetchLockData = async () => {
    setLoading(true)
    try {
      const [lockRes, reportRes, saeRes, queryRes] = await Promise.all([
        api.get<any>('/data/log'),
        api.get<any>('/data/report'),
        api.get<any>('/sae'),
        api.get<any>('/crf/queries'),
      ])

      const locks = lockRes.success ? (Array.isArray(lockRes.data) ? lockRes.data : []) : []
      const reports = reportRes.success ? (Array.isArray(reportRes.data) ? reportRes.data : []) : []
      const saes = saeRes.success ? (Array.isArray(saeRes.data) ? saeRes.data : []) : []
      const queries = queryRes.success ? (Array.isArray(queryRes.data) ? queryRes.data : []) : []

      const info: LockInfo[] = locks.map((lock: any) => {
        const report = reports.find((r: any) => r.trialId === lock.trialId)
        const lockUser = lock.lockedBy ? `用户${lock.lockedBy}` : '未知'
        const trialSAEs = saes.filter((s: any) => s.trialId === lock.trialId)
        const trialQueries = queries.filter((q: any) => q.trialId === lock.trialId)
        const openSAEs = trialSAEs.filter((s: any) => s.status !== 'closed').length
        const closedSAEs = trialSAEs.filter((s: any) => s.status === 'closed').length
        const saeByType: Record<string, number> = {}
        trialSAEs.forEach((s: any) => {
          saeByType[s.eventType] = (saeByType[s.eventType] || 0) + 1
        })
        const saeSummary = Object.entries(saeByType).map(([type, count]) => ({
          eventType: type,
          label: eventTypeLabels[type] || type,
          count,
        }))
        const unresolvedItems: { type: string; description: string; id: number }[] = []
        trialQueries.filter((q: any) => q.status !== 'closed').forEach((q: any) => {
          unresolvedItems.push({ type: 'query', description: q.question, id: q.id })
        })
        trialSAEs.filter((s: any) => s.status !== 'closed').forEach((s: any) => {
          unresolvedItems.push({ type: 'sae', description: `SAE-${s.id}: ${s.description?.substring(0, 50) || ''}`, id: s.id })
        })
        return {
          trialId: lock.trialId,
          trialName: report?.trialName || `试验${lock.trialId}`,
          lockedBy: lock.lockedBy,
          lockedByName: lockUser,
          lockedAt: lock.lockedAt,
          reason: lock.reason,
          status: lock.status,
          subjectCount: report?.enrollment?.total || 0,
          crfCompletionRate: report?.crfStats?.total > 0 ? Math.round((report.crfStats.verified / report.crfStats.total) * 100) : 0,
          openQueries: trialQueries.filter((q: any) => q.status === 'open').length,
          closedQueries: trialQueries.filter((q: any) => q.status === 'closed').length,
          totalQueries: trialQueries.length,
          saeCount: trialSAEs.length,
          openSAEs,
          closedSAEs,
          saeSummary,
          unresolvedItems,
        }
      })
      setLockInfo(info)
    } catch {}
    setLoading(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleDownload = async (info: LockInfo) => {
    try {
      const certRes = await api.get<any>(`/sae/certificate/1`)
      const lines: string[] = []
      lines.push('═══════════════════════════════════════════')
      lines.push('       数据锁定复核包报告')
      lines.push('═══════════════════════════════════════════')
      lines.push('')
      lines.push(`试验名称：${info.trialName}`)
      lines.push(`锁定时间：${info.lockedAt}`)
      lines.push(`锁定人：${info.lockedByName}`)
      lines.push(`锁定原因：${info.reason}`)
      lines.push(`锁定状态：${info.status}`)
      lines.push('')
      lines.push('─────── 纳入受试者 ───────')
      lines.push(`受试者总数：${info.subjectCount}`)
      lines.push('')
      lines.push('─────── CRF完成率 ───────')
      lines.push(`完成率：${info.crfCompletionRate}%`)
      lines.push('')
      lines.push('─────── 质疑清单 ───────')
      lines.push(`总计：${info.totalQueries}条`)
      lines.push(`待处理：${info.openQueries}条`)
      lines.push(`已关闭：${info.closedQueries}条`)
      info.unresolvedItems.filter(i => i.type === 'query').forEach((item, i) => {
        lines.push(`  ${i + 1}. [质疑#${item.id}] ${item.description}`)
      })
      lines.push('')
      lines.push('─────── SAE处置摘要 ───────')
      lines.push(`SAE总数：${info.saeCount}例`)
      lines.push(`未关闭：${info.openSAEs}例`)
      lines.push(`已关闭：${info.closedSAEs}例`)
      info.saeSummary.forEach(s => {
        lines.push(`  ${s.label}：${s.count}例`)
      })
      lines.push('')
      lines.push('─────── 未解决事项 ───────')
      if (info.unresolvedItems.length === 0) {
        lines.push('  暂无未解决事项')
      } else {
        info.unresolvedItems.forEach((item, i) => {
          lines.push(`  ${i + 1}. [${item.type === 'query' ? '质疑' : 'SAE'}#${item.id}] ${item.description}`)
        })
      }
      lines.push('')
      lines.push('─────── SAE凭证索引 ───────')
      try {
        const saeListRes = await api.get<any>(`/sae?trialId=${info.trialId}`)
        if (saeListRes.success && saeListRes.data) {
          saeListRes.data.forEach((sae: any) => {
            lines.push(`  SAE-CERT-${String(sae.id).padStart(4, '0')}: ${eventTypeLabels[sae.eventType] || sae.eventType} - 受试者${sae.subjectCode || sae.subjectName || sae.subjectId} (${statusLabels[sae.status] || sae.status})`)
          })
        }
      } catch {}
      lines.push('')
      lines.push('═══════════════════════════════════════════')
      lines.push('  本复核包由临床试验管理系统自动生成')
      lines.push('═══════════════════════════════════════════')
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `复核包_${info.trialName}_${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)
      showToast('复核包已下载')
    } catch {
      showToast('下载失败')
    }
  }

  const statusLabels: Record<string, string> = {
    reported: '已报告', under_review: '审查中', submitted: '已提交', closed: '已关闭',
  }

  const displayInfo = selectedTrial ? lockInfo.filter(l => l.trialId === selectedTrial) : lockInfo

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-slate-400">加载中...</p></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Lock} title="数据锁定复核包" />

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3">
        <select
          value={selectedTrial}
          onChange={(e) => setSelectedTrial(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
        >
          <option value="">全部试验</option>
          {lockInfo.map(l => (
            <option key={l.trialId} value={l.trialId}>{l.trialName}</option>
          ))}
        </select>
      </div>

      {displayInfo.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--border)] p-8 text-center text-slate-400 text-sm">
          暂无数据锁定记录
        </div>
      ) : (
        displayInfo.map((info) => (
          <div key={info.trialId} className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{info.trialName}</h3>
                  <p className="text-xs text-slate-400">锁定时间：{info.lockedAt} · 锁定人：{info.lockedByName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  info.status === 'locked' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                }`}>
                  {info.status === 'locked' ? '已锁定' : info.status === 'unlock_requested' ? '解锁请求中' : '已解锁'}
                </span>
                <button
                  onClick={() => handleDownload(info)}
                  className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  下载复核包
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">纳入受试者</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{info.subjectCount}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">CRF完成率</p>
                <p className="text-2xl font-bold text-teal-700 mt-1">{info.crfCompletionRate}%</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">未关闭质疑</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{info.openQueries}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">SAE处置</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{info.saeCount}例</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                未解决事项清单 ({info.unresolvedItems.length})
              </h4>
              {info.unresolvedItems.length === 0 ? (
                <p className="text-sm text-slate-400">暂无未解决事项</p>
              ) : (
                <div className="space-y-2">
                  {info.unresolvedItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                      {item.type === 'query' ? (
                        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span className={`text-xs font-medium ${item.type === 'query' ? 'text-amber-700' : 'text-red-700'}`}>
                          {item.type === 'query' ? '质疑' : 'SAE'} #{item.id}
                        </span>
                        <p className="text-sm text-slate-700">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                SAE处置摘要
              </h4>
              {info.saeSummary.length === 0 ? (
                <p className="text-sm text-slate-400">无SAE记录</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {info.saeSummary.map(s => (
                    <div key={s.eventType} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">{s.label}</p>
                      <p className="text-lg font-bold text-slate-800">{s.count}例</p>
                    </div>
                  ))}
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">已关闭</p>
                    <p className="text-lg font-bold text-green-700">{info.closedSAEs}例</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600">未关闭</p>
                    <p className="text-lg font-bold text-red-700">{info.openSAEs}例</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function HelpCircle(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}
