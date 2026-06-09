import { useState, useEffect } from 'react'
import { Download, Lock, FileText, AlertTriangle, HelpCircle, Users, Building2, Clock } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface CenterCoverage {
  centerId: number
  centerName: string
  subjectCount: number
  crfCompletionRate: number
  openQueries: number
  openSAEs: number
}

interface UnresolvedItem {
  type: string
  description: string
  id: number
  assignee: string
  plannedCloseDate: string
  centerName: string
}

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
  unresolvedItems: UnresolvedItem[]
  centerCoverages: CenterCoverage[]
  preLockQueries: number
  postLockQueries: number
  preLockSAEs: number
  postLockSAEs: number
}

const eventTypeLabels: Record<string, string> = {
  death: '死亡', life_threatening: '危及生命',
  hospitalization: '住院', disabling: '致残',
  congenital_anomaly: '先天异常', other_serious: '其他严重',
}

const statusLabels: Record<string, string> = {
  reported: '已报告', under_review: '审查中', submitted: '已提交', closed: '已关闭',
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
      const [lockRes, reportRes, saeRes, queryRes, subjectRes] = await Promise.all([
        api.get<any>('/data/log'),
        api.get<any>('/data/report'),
        api.get<any>('/sae'),
        api.get<any>('/crf/queries'),
        api.get<any>('/subjects'),
      ])

      const locks = lockRes.success ? (Array.isArray(lockRes.data) ? lockRes.data : []) : []
      const reports = reportRes.success ? (Array.isArray(reportRes.data) ? reportRes.data : []) : []
      const saes = saeRes.success ? (Array.isArray(saeRes.data) ? saeRes.data : []) : []
      const queries = queryRes.success ? (Array.isArray(queryRes.data) ? queryRes.data : []) : []
      const allSubjects = subjectRes.success ? (Array.isArray(subjectRes.data) ? subjectRes.data : []) : []

      const info: LockInfo[] = locks.map((lock: any) => {
        const report = reports.find((r: any) => r.trialId === lock.trialId)
        const lockUserRes = report ? `用户${lock.lockedBy}` : '未知'
        const trialSubjects = allSubjects.filter((s: any) => s.trialId === lock.trialId)
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

        const lockDate = lock.lockedAt ? new Date(lock.lockedAt) : null
        const preLockQueries = lockDate ? trialQueries.filter((q: any) => new Date(q.createdAt) <= lockDate).length : trialQueries.length
        const postLockQueries = lockDate ? trialQueries.filter((q: any) => new Date(q.createdAt) > lockDate).length : 0
        const preLockSAEs = lockDate ? trialSAEs.filter((s: any) => new Date(s.reportDate) <= lockDate).length : trialSAEs.length
        const postLockSAEs = lockDate ? trialSAEs.filter((s: any) => new Date(s.reportDate) > lockDate).length : 0

        const centerMap = new Map<number, string>()
        if (report?.centers) {
          report.centers.forEach((c: any) => centerMap.set(c.id, c.name))
        }
        trialSubjects.forEach((s: any) => {
          if (s.centerId && !centerMap.has(s.centerId)) centerMap.set(s.centerId, `中心${s.centerId}`)
        })

        const centerCoverages: CenterCoverage[] = Array.from(centerMap.entries()).map(([centerId, centerName]) => {
          const centerSubjects = trialSubjects.filter((s: any) => s.centerId === centerId)
          const centerSubjectIds = new Set(centerSubjects.map((s: any) => s.id))
          const centerQueries = trialQueries.filter((q: any) => centerSubjectIds.has(q.subjectId))
          const centerSAEs = trialSAEs.filter((s: any) => centerSubjectIds.has(s.subjectId))
          const centerCRFs = report?.centers?.find((c: any) => c.id === centerId)
          return {
            centerId,
            centerName,
            subjectCount: centerSubjects.length,
            crfCompletionRate: report?.crfStats?.total > 0 ? Math.round((report.crfStats.verified / report.crfStats.total) * 100) : 0,
            openQueries: centerQueries.filter((q: any) => q.status !== 'closed').length,
            openSAEs: centerSAEs.filter((s: any) => s.status !== 'closed').length,
          }
        })

        const unresolvedItems: UnresolvedItem[] = []
        trialQueries.filter((q: any) => q.status !== 'closed').forEach((q: any) => {
          const subj = trialSubjects.find((s: any) => s.id === q.subjectId)
          const centerName = subj ? (centerMap.get(subj.centerId) || '未知中心') : '未知中心'
          unresolvedItems.push({
            type: 'query',
            description: q.question,
            id: q.id,
            assignee: q.assignedTo ? `用户${q.assignedTo}` : '待分配',
            plannedCloseDate: q.deadline || '待定',
            centerName,
          })
        })
        trialSAEs.filter((s: any) => s.status !== 'closed').forEach((s: any) => {
          const subj = trialSubjects.find((sub: any) => sub.id === s.subjectId)
          const centerName = subj ? (centerMap.get(subj.centerId) || '未知中心') : '未知中心'
          unresolvedItems.push({
            type: 'sae',
            description: `SAE-${s.id}: ${s.description?.substring(0, 50) || ''}`,
            id: s.id,
            assignee: s.assigneeId ? `用户${s.assigneeId}` : '待分配',
            plannedCloseDate: s.deadline || '待定',
            centerName,
          })
        })

        return {
          trialId: lock.trialId,
          trialName: report?.trialName || `试验${lock.trialId}`,
          lockedBy: lock.lockedBy,
          lockedByName: lockUserRes,
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
          centerCoverages,
          preLockQueries,
          postLockQueries,
          preLockSAEs,
          postLockSAEs,
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

  const downloadSaeCertText = async (saeId: number): Promise<string[]> => {
    try {
      const res = await api.get<any>(`/sae/certificate/${saeId}`)
      if (res.success && res.data) {
        const c = res.data
        return [
          `  凭证编号：${c.certificateId}`,
          `  受试者：${c.subjectName} (${c.subjectCode})`,
          `  事件类型：${c.eventType}`,
          `  报告日期：${c.reportDate}  截止日期：${c.deadline}`,
          `  报告人：${c.reporterName}  监管状态：${c.regulatoryStatus || '待提交'}`,
          `  处理记录：`,
          ...(c.processingRecords || []).map((r: any, i: number) =>
            `    ${i + 1}. [${r.time}] ${r.action} - ${r.operator}${r.detail ? ` (${r.detail})` : ''}`
          ),
        ]
      }
    } catch {}
    return [`  SAE-CERT-${String(saeId).padStart(4, '0')}: 凭证获取失败`]
  }

  const handleDownload = async (info: LockInfo) => {
    try {
      const lines: string[] = []
      lines.push('═══════════════════════════════════════════')
      lines.push('       数据锁定复核包报告')
      lines.push('═══════════════════════════════════════════')
      lines.push('')
      lines.push(`试验名称：${info.trialName}`)
      lines.push(`锁定时间：${info.lockedAt}`)
      lines.push(`锁定人：${info.lockedByName}`)
      lines.push(`锁定原因：${info.reason}`)
      lines.push(`锁定状态：${info.status === 'locked' ? '已锁定' : info.status === 'unlock_requested' ? '解锁请求中' : '已解锁'}`)
      lines.push('')
      lines.push('─────── 统计摘要 ───────')
      lines.push(`纳入受试者：${info.subjectCount}例`)
      lines.push(`CRF完成率：${info.crfCompletionRate}%`)
      lines.push(`质疑：总计${info.totalQueries}条 待处理${info.openQueries}条 已关闭${info.closedQueries}条`)
      lines.push(`SAE：总计${info.saeCount}例 未关闭${info.openSAEs}例 已关闭${info.closedSAEs}例`)
      lines.push('')
      lines.push('─────── 锁定前后变化 ───────')
      lines.push(`质疑：锁定前${info.preLockQueries}条 → 锁定后新增${info.postLockQueries}条`)
      lines.push(`SAE：锁定前${info.preLockSAEs}例 → 锁定后新增${info.postLockSAEs}例`)
      lines.push('')
      lines.push('─────── 各中心锁定覆盖情况 ───────')
      info.centerCoverages.forEach(c => {
        lines.push(`  ${c.centerName}：受试者${c.subjectCount}例 CRF完成率${c.crfCompletionRate}% 未关闭质疑${c.openQueries} 未关闭SAE${c.openSAEs}`)
      })
      lines.push('')
      lines.push('─────── 未解决事项清单 ───────')
      if (info.unresolvedItems.length === 0) {
        lines.push('  暂无未解决事项')
      } else {
        info.unresolvedItems.forEach((item, i) => {
          lines.push(`  ${i + 1}. [${item.type === 'query' ? '质疑' : 'SAE'}#${item.id}] ${item.description}`)
          lines.push(`     中心：${item.centerName}  负责人：${item.assignee}  计划关闭：${item.plannedCloseDate}`)
        })
      }
      lines.push('')
      lines.push('─────── SAE处置摘要 ───────')
      lines.push(`SAE总数：${info.saeCount}例`)
      lines.push(`未关闭：${info.openSAEs}例`)
      lines.push(`已关闭：${info.closedSAEs}例`)
      info.saeSummary.forEach(s => {
        lines.push(`  ${s.label}：${s.count}例`)
      })
      lines.push('')
      lines.push('─────── SAE凭证索引 ───────')
      try {
        const saeListRes = await api.get<any>(`/sae?trialId=${info.trialId}`)
        if (saeListRes.success && saeListRes.data) {
          for (const sae of saeListRes.data) {
            lines.push(`  SAE-CERT-${String(sae.id).padStart(4, '0')}: ${eventTypeLabels[sae.eventType] || sae.eventType} - 受试者${sae.subjectCode || sae.subjectName || sae.subjectId} (${statusLabels[sae.status] || sae.status})`)
          }
        }
      } catch {}
      lines.push('')
      lines.push('─────── 质疑清单汇总 ───────')
      info.unresolvedItems.filter(i => i.type === 'query').forEach((item, i) => {
        lines.push(`  ${i + 1}. [质疑#${item.id}] ${item.description} (中心:${item.centerName} 负责人:${item.assignee})`)
      })
      lines.push('')
      lines.push('─────── 中心差异说明 ───────')
      if (info.centerCoverages.length > 1) {
        const maxSubj = Math.max(...info.centerCoverages.map(c => c.subjectCount))
        const minSubj = Math.min(...info.centerCoverages.map(c => c.subjectCount))
        const diff = maxSubj - minSubj
        lines.push(`各中心入组差异：最大${maxSubj}例 最小${minSubj}例 差异${diff}例`)
        info.centerCoverages.forEach(c => {
          lines.push(`  ${c.centerName}：${c.subjectCount}例受试者 CRF完成率${c.crfCompletionRate}%`)
        })
      } else {
        lines.push('仅单一中心，无差异')
      }
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

  const handleDownloadSaeCert = async (saeId: number) => {
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
        showToast('SAE凭证已下载')
      }
    } catch {
      showToast('凭证下载失败')
    }
  }

  const displayInfo = selectedTrial ? lockInfo.filter(l => l.trialId === selectedTrial) : lockInfo

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-slate-400">加载中...</p></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Lock className="w-5 h-5 text-teal-700" />} title="数据锁定复核包" />

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
                <Building2 className="w-4 h-4 text-purple-500" />
                各中心锁定覆盖情况
              </h4>
              {info.centerCoverages.length === 0 ? (
                <p className="text-sm text-slate-400">暂无中心数据</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">中心名称</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">受试者</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">CRF完成率</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">未关闭质疑</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">未关闭SAE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.centerCoverages.map(c => (
                        <tr key={c.centerId} className="border-b border-slate-50">
                          <td className="py-2 px-3 text-slate-700">{c.centerName}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-800">{c.subjectCount}例</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`font-medium ${c.crfCompletionRate >= 80 ? 'text-teal-700' : 'text-amber-600'}`}>
                              {c.crfCompletionRate}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`font-medium ${c.openQueries > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                              {c.openQueries}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`font-medium ${c.openSAEs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {c.openSAEs}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                锁定前后变化
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">质疑变化</p>
                  <p className="text-sm text-blue-800 mt-1">锁定前 {info.preLockQueries} 条 → 锁定后新增 <span className="font-bold text-blue-700">{info.postLockQueries}</span> 条</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">SAE变化</p>
                  <p className="text-sm text-red-800 mt-1">锁定前 {info.preLockSAEs} 例 → 锁定后新增 <span className="font-bold text-red-700">{info.postLockSAEs}</span> 例</p>
                </div>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">类型</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">编号</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">描述</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">中心</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">负责人</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">计划关闭</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.unresolvedItems.map((item, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.type === 'query' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.type === 'query' ? '质疑' : 'SAE'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-mono">#{item.id}</td>
                          <td className="py-2 px-3 text-slate-700 max-w-xs truncate">{item.description}</td>
                          <td className="py-2 px-3 text-slate-600">{item.centerName}</td>
                          <td className="py-2 px-3 text-slate-600">{item.assignee}</td>
                          <td className="py-2 px-3 text-slate-600">{item.plannedCloseDate}</td>
                          <td className="py-2 px-3">
                            {item.type === 'sae' && (
                              <button
                                onClick={() => handleDownloadSaeCert(item.id)}
                                className="text-teal-700 hover:text-teal-800 text-xs flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                凭证
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <div className="space-y-3">
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
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">SAE凭证索引</p>
                    <SAECertificateIndex trialId={info.trialId} onDownload={handleDownloadSaeCert} />
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

function SAECertificateIndex({ trialId, onDownload }: { trialId: number; onDownload: (id: number) => void }) {
  const [saeList, setSaeList] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<any>(`/sae?trialId=${trialId}`)
        if (res.success && res.data) setSaeList(res.data)
      } catch {}
    }
    load()
  }, [trialId])

  if (saeList.length === 0) return <p className="text-xs text-slate-400">无SAE凭证</p>

  return (
    <div className="space-y-1">
      {saeList.map(sae => (
        <div key={sae.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500">SAE-CERT-{String(sae.id).padStart(4, '0')}</span>
            <span className="text-slate-700">{eventTypeLabels[sae.eventType] || sae.eventType}</span>
            <span className="text-slate-400">- {sae.subjectCode || sae.subjectName}</span>
          </div>
          <button
            onClick={() => onDownload(sae.id)}
            className="text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            下载凭证
          </button>
        </div>
      ))}
    </div>
  )
}
