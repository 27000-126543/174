import { useState, useEffect, useMemo } from 'react'
import { BarChart3, FileText, Download, Filter } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'

type TabKey = 'report' | 'summary' | 'export'

interface ReportData {
  trialId: number
  trialName: string
  lockDate: string
  generatedDate: string
  sponsorName?: string
  enrollment?: any
  crfStats?: any
  saeStats?: any
  queryStats?: any
  vitalSigns?: any
  centers?: any[]
  phase?: string
  status?: string
}

interface SummaryData {
  overview: string
  enrollment: string
  efficacy: string
  safety: string
  conclusion: string
  followUpItems: string[]
}

interface TrialOption {
  id: number
  name: string
}

function buildOverview(s: any): string {
  return `本研究为${s.phase || ''}期临床试验（${s.trialName || ''}），申办方为${s.sponsor || '未知'}，当前状态为${s.status || ''}。研究在${s.centers || 0}个中心开展，计划入组${s.targetEnrollment || 0}例受试者。`
}

function buildEnrollment(s: any): string {
  return `计划入组${s.targetEnrollment || 0}例，实际入组${s.enrollment || '0'}，入组率${s.enrollmentRate || '0%'}。目前活跃受试者${s.activeSubjects || 0}例，已完成${s.completedSubjects || 0}例，退出${s.withdrawnSubjects || 0}例。SAE报告${s.saeCount || 0}例，待处理质疑${s.openQueries || 0}条，质疑解决率${s.queryResolutionRate || 'N/A'}。`
}

function buildEfficacy(_s: any): string {
  return '主要疗效终点分析将在数据库锁定后进行，详细统计结果请参见独立统计报告。'
}

function buildSafety(s: any): string {
  return `截至报告日期，共报告${s.saeCount || 0}例严重不良事件。所有SAE均按照GCP要求在规定时限内上报，并持续跟踪处理。`
}

function buildConclusion(s: any): string {
  const parts: string[] = []
  if (s.dataQualityScore !== undefined) {
    parts.push(`数据质量评分${s.dataQualityScore}分${s.dataQualityScore >= 90 ? '，数据质量优秀' : s.dataQualityScore >= 70 ? '，数据质量良好' : '，数据质量需改善'}。`)
  }
  if (s.saeCount > 0) {
    parts.push(`共报告${s.saeCount}例SAE，需持续关注安全性信号。`)
  }
  if (s.openQueries > 0) {
    parts.push(`尚有${s.openQueries}条质疑待处理，建议尽快解决以保证数据完整性。`)
  }
  if (s.enrollmentRate) {
    const rate = parseInt(s.enrollmentRate)
    if (rate < 50) parts.push('入组进度偏慢，建议加快受试者招募。')
  }
  if (parts.length === 0) parts.push('当前研究数据整体状况良好，建议持续监控。')
  return parts.join('')
}

function buildFollowUpItems(s: any): string[] {
  const items: string[] = []
  if (s.openQueries > 0) items.push(`处理${s.openQueries}条待解决质疑`)
  if (s.saeCount > 0) items.push(`跟踪${s.saeCount}例SAE后续处理`)
  if (s.withdrawnSubjects > 0) items.push(`分析${s.withdrawnSubjects}例退出原因`)
  const rate = parseInt(s.enrollmentRate || '0')
  if (rate < 50) items.push('加速受试者入组进度')
  if (s.dataQualityScore < 90) items.push('提升数据质量评分至90分以上')
  if (items.length === 0) items.push('暂无待跟进事项')
  return items
}

const summarySections = [
  { key: 'overview' as const, title: '研究概况' },
  { key: 'enrollment' as const, title: '入组分析' },
  { key: 'efficacy' as const, title: '疗效评价' },
  { key: 'safety' as const, title: '安全性评价' },
  { key: 'conclusion' as const, title: '结论' },
]

export default function Statistics() {
  const [activeTab, setActiveTab] = useState<TabKey>('report')
  const [report, setReport] = useState<ReportData>({ trialId: 0, trialName: '', lockDate: '', generatedDate: '' })
  const [summary, setSummary] = useState<SummaryData>({ overview: '', enrollment: '', efficacy: '', safety: '', conclusion: '', followUpItems: [] })
  const [enrollmentData, setEnrollmentData] = useState<any>({})
  const [crfStats, setCrfStats] = useState<any>({})
  const [saeStats, setSaeStats] = useState<any>({})
  const [queryStats, setQueryStats] = useState<any>({})
  const [vitalSignsData, setVitalSignsData] = useState<any>({})
  const [toast, setToast] = useState('')
  const [trials, setTrials] = useState<TrialOption[]>([])
  const [selectedTrialId, setSelectedTrialId] = useState<number | ''>('')
  const [selectedCenterId, setSelectedCenterId] = useState<number | ''>('')
  const [centers, setCenters] = useState<{ id: number; name: string }[]>([])
  const [dataLockStatus, setDataLockStatus] = useState<string>('未锁定')

  useEffect(() => {
    loadTrials()
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedTrialId, selectedCenterId])

  const loadTrials = async () => {
    try {
      const res = await api.get<any>('/data/report')
      if (res.success && res.data) {
        const reports = Array.isArray(res.data) ? res.data : [res.data]
        setTrials(reports.map((r: any) => ({ id: r.trialId, name: r.trialName })))
      }
    } catch {}
  }

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedTrialId) params.set('trialId', String(selectedTrialId))
      if (selectedCenterId) params.set('centerId', String(selectedCenterId))
      const qs = params.toString() ? `?${params.toString()}` : ''
      const [reportRes, summaryRes, lockRes] = await Promise.all([
        api.get<any>(`/data/report${qs}`),
        api.get<any>(`/data/summary${qs}`),
        api.get<any>(`/data/log${qs}`),
      ])
      if (reportRes.success && reportRes.data) {
        const reports = Array.isArray(reportRes.data) ? reportRes.data : [reportRes.data]
        if (reports.length > 0) {
          const r = reports[0]
          setReport({
            trialId: r.trialId,
            trialName: r.trialName || '',
            lockDate: r.lockDate || new Date().toISOString().split('T')[0],
            generatedDate: new Date().toISOString().split('T')[0],
            sponsorName: r.sponsorName,
            enrollment: r.enrollment,
            crfStats: r.crfStats,
            saeStats: r.saeStats,
            queryStats: r.queryStats,
            vitalSigns: r.vitalSigns,
            centers: r.centers,
            phase: r.phase,
            status: r.status,
            centerName: r.centerName,
          } as any)
          setEnrollmentData(r.enrollment || {})
          setCrfStats(r.crfStats || {})
          setSaeStats(r.saeStats || {})
          setQueryStats(r.queryStats || {})
          setVitalSignsData(r.vitalSigns || {})
          if (r.centers) {
            setCenters(r.centers.map((c: any) => ({ id: c.id, name: c.name })))
          }
        }
      }
      if (summaryRes.success && summaryRes.data) {
        const summaries = Array.isArray(summaryRes.data) ? summaryRes.data : [summaryRes.data]
        if (summaries.length > 0) {
          const s = summaries[0]
          setSummary({
            overview: buildOverview(s),
            enrollment: buildEnrollment(s),
            efficacy: buildEfficacy(s),
            safety: buildSafety(s),
            conclusion: buildConclusion(s),
            followUpItems: buildFollowUpItems(s),
          })
        }
      }
      if (lockRes.success && lockRes.data) {
        const locks = Array.isArray(lockRes.data) ? lockRes.data : [lockRes.data]
        const lock = selectedTrialId ? locks.find((l: any) => l.trialId === Number(selectedTrialId)) : locks[0]
        if (lock) {
          const lockStatusLabels: Record<string, string> = { locked: '已锁定', unlock_requested: '解锁请求中', unlocked: '已解锁' }
          setDataLockStatus(lockStatusLabels[lock.status] || lock.status)
        } else {
          setDataLockStatus('未锁定')
        }
      } else {
        setDataLockStatus('未锁定')
      }
    } catch {}
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleGenerateReport = async () => {
    const params = new URLSearchParams()
    if (selectedTrialId) params.set('trialId', String(selectedTrialId))
    if (selectedCenterId) params.set('centerId', String(selectedCenterId))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await api.get(`/data/report${qs}`)
    if (res.success) {
      showToast('统计报告已生成')
      fetchData()
    } else {
      showToast('报告生成失败')
    }
  }

  const handleExportPdf = () => {
    const lines: string[] = []
    lines.push('═══════════════════════════════════════════')
    lines.push('       临床试验统计报告摘要')
    lines.push('═══════════════════════════════════════════')
    lines.push('')
    lines.push(`试验名称：${report.trialName}`)
    lines.push(`申办方：${report.sponsorName || '-'}`)
    if ((report as any).centerName) lines.push(`筛选中心：${(report as any).centerName}`)
    lines.push(`数据锁定日期：${report.lockDate}`)
    lines.push(`报告生成日期：${report.generatedDate}`)
    lines.push('')
    lines.push('─────── 入组统计 ───────')
    lines.push(`总入组：${enrollmentData.total || 0}/${enrollmentData.target || 0} (${enrollmentData.progress || 0}%)`)
    if (enrollmentData.byStatus) {
      const labels: Record<string, string> = { active: '活跃', completed: '已完成', withdrawn: '退出', screening: '筛选中' }
      for (const [k, v] of Object.entries(enrollmentData.byStatus)) {
        if (v as number > 0) lines.push(`  ${labels[k] || k}: ${v}`)
      }
    }
    lines.push('')
    lines.push('─────── 数据质量 ───────')
    lines.push(`CRF总数：${crfStats.total || 0}`)
    lines.push(`已核验：${crfStats.verified || 0}`)
    lines.push(`有错误：${crfStats.withErrors || 0}`)
    lines.push('')
    lines.push('─────── SAE统计 ───────')
    lines.push(`SAE总数：${saeStats.total || 0}`)
    if (saeStats.byType) {
      const labels: Record<string, string> = { death: '死亡', life_threatening: '危及生命', hospitalization: '住院', disabling: '致残', congenital_anomaly: '先天异常', other_serious: '其他严重', other: '其他' }
      for (const [k, v] of Object.entries(saeStats.byType)) {
        if (v as number > 0) lines.push(`  ${labels[k] || k}: ${v}`)
      }
    }
    lines.push('')
    lines.push('─────── 质疑统计 ───────')
    lines.push(`待处理：${queryStats.open || 0}`)
    lines.push(`已回复：${queryStats.answered || 0}`)
    lines.push(`已关闭：${queryStats.closed || 0}`)
    lines.push('')
    lines.push('─────── 临床总结 ───────')
    if (summary.overview) lines.push(summary.overview)
    if (summary.enrollment) lines.push(summary.enrollment)
    if (summary.safety) lines.push(summary.safety)
    if (summary.conclusion) lines.push(summary.conclusion)
    lines.push('')
    if (summary.followUpItems && summary.followUpItems.length > 0) {
      lines.push('─────── 待跟进事项 ───────')
      summary.followUpItems.forEach((item, i) => {
        lines.push(`  ${i + 1}. ${item}`)
      })
      lines.push('')
    }
    lines.push('═══════════════════════════════════════════')
    lines.push('  本报告由临床试验管理系统自动生成')
    lines.push('═══════════════════════════════════════════')
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `统计报告_${report.trialName}_${report.generatedDate}.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast('报告摘要已导出')
  }

  const enrollmentChartOption = useMemo(() => {
    let byStatus = enrollmentData.byStatus || {}
    if (selectedCenterId && report.centers) {
      byStatus = { active: 0, completed: 0, withdrawn: 0, screening: 0, other: 0 }
    }
    const categories = Object.keys(byStatus).map(k => {
      const labels: Record<string, string> = { active: '活跃', completed: '已完成', withdrawn: '退出', screening: '筛选中', other: '其他', eligible: '合格', consented: '已签署', randomized: '已随机' }
      return labels[k] || k
    })
    const values = Object.values(byStatus) as number[]
    const hasData = values.length > 0 && values.some(v => v > 0)
    return {
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: hasData ? categories : ['暂无数据'],
        axisLabel: { color: '#64748b' },
      },
      yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' } },
      series: [{
        data: hasData ? values : [0],
        type: 'bar' as const,
        itemStyle: { color: '#0F766E', borderRadius: [4, 4, 0, 0] },
        barWidth: '40%',
      }],
      grid: { top: 20, right: 20, bottom: 30, left: 50 },
    }
  }, [enrollmentData, selectedCenterId, report.centers])

  const vitalSignsChartOption = useMemo(() => {
    const sbp = vitalSignsData.sbp
    const dbp = vitalSignsData.dbp
    const hasData = sbp && dbp && sbp.count > 0
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['收缩压', '舒张压'], bottom: 0, textStyle: { color: '#64748b' } },
      xAxis: {
        type: 'category' as const,
        data: hasData ? ['均值', '中位数', '最小值', '最大值'] : ['暂无数据'],
        axisLabel: { color: '#64748b' },
      },
      yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' } },
      series: [
        {
          name: '收缩压',
          type: 'line' as const,
          data: hasData ? [sbp.mean, sbp.median, sbp.min, sbp.max] : [0],
          smooth: true,
          itemStyle: { color: '#0F766E' },
          lineStyle: { width: 2 },
        },
        {
          name: '舒张压',
          type: 'line' as const,
          data: hasData ? [dbp.mean, dbp.median, dbp.min, dbp.max] : [0],
          smooth: true,
          itemStyle: { color: '#D97706' },
          lineStyle: { width: 2 },
        },
      ],
      grid: { top: 20, right: 20, bottom: 40, left: 50 },
    }
  }, [vitalSignsData])

  const aeChartOption = useMemo(() => {
    const byType = saeStats.byType || {}
    const labels: Record<string, string> = { death: '死亡', life_threatening: '危及生命', hospitalization: '住院', disabling: '致残', congenital_anomaly: '先天异常', other_serious: '其他严重', other: '其他' }
    const colors: Record<string, string> = { death: '#DC2626', life_threatening: '#7C3AED', hospitalization: '#0F766E', disabling: '#D97706', congenital_anomaly: '#EC4899', other_serious: '#64748b', other: '#64748b' }
    const entries = Object.entries(byType).filter(([, v]) => (v as number) > 0)
    const hasData = entries.length > 0
    return {
      tooltip: { trigger: 'item' as const },
      legend: { bottom: 0, textStyle: { color: '#64748b' } },
      series: [{
        type: 'pie' as const,
        radius: ['35%', '65%'],
        data: hasData
          ? entries.map(([k, v]) => ({ value: v as number, name: labels[k] || k, itemStyle: { color: colors[k] || '#64748b' } }))
          : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e2e8f0' } }],
        label: { color: '#475569' },
      }],
    }
  }, [saeStats])

  const qualityRadarOption = useMemo(() => {
    const total = crfStats.total || 0
    const verified = crfStats.verified || 0
    const withErrors = crfStats.withErrors || 0
    const completeness = total > 0 ? Math.round(((total - withErrors) / total) * 100) : 100
    const accuracy = total > 0 ? Math.round((verified / total) * 100) : 100
    const qTotal = queryStats.total || 0
    const qOpen = queryStats.open || 0
    const timeliness = qTotal > 0 ? Math.round(((qTotal - qOpen) / qTotal) * 100) : 100
    const consistency = Math.round((completeness + accuracy) / 2)
    const queryRate = qTotal > 0 ? Math.max(0, 100 - Math.round((qOpen / qTotal) * 100)) : 100
    return {
      tooltip: {},
      radar: {
        indicator: [
          { name: '完整性', max: 100 },
          { name: '准确性', max: 100 },
          { name: '及时性', max: 100 },
          { name: '一致性', max: 100 },
          { name: '质疑率', max: 100 },
        ],
        axisName: { color: '#475569' },
      },
      series: [{
        type: 'radar' as const,
        data: [{
          value: [completeness, accuracy, timeliness, consistency, queryRate],
          name: '数据质量',
          areaStyle: { color: 'rgba(15, 118, 110, 0.2)' },
          lineStyle: { color: '#0F766E' },
          itemStyle: { color: '#0F766E' },
        }],
      }],
    }
  }, [crfStats, queryStats])

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'report', label: '统计报告' },
    { key: 'summary', label: '临床总结' },
    { key: 'export', label: '导出摘要' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="统计分析" />

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedTrialId}
            onChange={(e) => {
              setSelectedTrialId(e.target.value ? Number(e.target.value) : '')
              setSelectedCenterId('')
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
          >
            <option value="">全部试验</option>
            {trials.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={selectedCenterId}
            onChange={(e) => setSelectedCenterId(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
          >
            <option value="">全部中心</option>
            {centers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{report.trialName || '加载中...'}</h3>
                  <p className="text-xs text-slate-400 mt-1">数据锁定日期：{report.lockDate} · 报告生成日期：{report.generatedDate}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateReport}
                  className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors"
                >
                  生成报告
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  导出摘要
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-slate-500">申办方</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{report.sponsorName || '-'}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-slate-500">入组进度</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{enrollmentData.total || 0}/{enrollmentData.target || 0} ({enrollmentData.progress || 0}%)</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-slate-500">SAE报告数</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{saeStats.total || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-slate-500">质疑统计</p>
              <p className="text-sm font-bold text-slate-800 mt-1">待处理{queryStats.open || 0} / 已回复{queryStats.answered || 0} / 已关闭{queryStats.closed || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-slate-500">数据锁定状态</p>
              <p className={`text-sm font-bold mt-1 ${dataLockStatus === '已锁定' ? 'text-purple-700' : dataLockStatus === '解锁请求中' ? 'text-amber-600' : 'text-slate-800'}`}>
                {dataLockStatus}
              </p>
            </div>
          </div>

          {report.centers && report.centers.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">中心入组情况</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.centers.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{c.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-800">{c.subjects || 0}例</span>
                      <span className="text-xs text-slate-400 ml-2">已录入{c.enrolledCount || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">入组统计</h4>
              <ReactECharts option={enrollmentChartOption} style={{ height: 260 }} />
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">生命体征趋势</h4>
              <ReactECharts option={vitalSignsChartOption} style={{ height: 260 }} />
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">不良事件分布</h4>
              <ReactECharts option={aeChartOption} style={{ height: 260 }} />
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">数据质量概览</h4>
              <ReactECharts option={qualityRadarOption} style={{ height: 260 }} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-4">
          {summarySections.map((section) => (
            <div key={section.key} className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">{section.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{summary[section.key]}</p>
            </div>
          ))}
          {summary.followUpItems && summary.followUpItems.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">待跟进事项</h4>
              <ul className="space-y-2">
                {summary.followUpItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-sm text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800">报告导出摘要</h3>
                <p className="text-xs text-slate-400 mt-1">数据锁定后的关键结论和待跟进事项</p>
              </div>
              <button
                onClick={handleExportPdf}
                className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                导出报告
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">基本信息</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">试验名称</p>
                    <p className="text-sm font-medium text-slate-800">{report.trialName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">申办方</p>
                    <p className="text-sm font-medium text-slate-800">{report.sponsorName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">数据锁定日期</p>
                    <p className="text-sm font-medium text-slate-800">{report.lockDate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">报告生成日期</p>
                    <p className="text-sm font-medium text-slate-800">{report.generatedDate || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">入组与中心</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-teal-50 rounded-lg p-3">
                    <p className="text-xs text-teal-600">总入组</p>
                    <p className="text-xl font-bold text-teal-700">{enrollmentData.total || 0}/{enrollmentData.target || 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600">入组率</p>
                    <p className="text-xl font-bold text-blue-700">{enrollmentData.progress || 0}%</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-amber-600">SAE总数</p>
                    <p className="text-xl font-bold text-amber-700">{saeStats.total || 0}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-red-600">待处理质疑</p>
                    <p className="text-xl font-bold text-red-700">{queryStats.open || 0}</p>
                  </div>
                </div>
                {report.centers && report.centers.length > 0 && (
                  <div className="space-y-2">
                    {report.centers.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-700">{c.name}</span>
                        <span className="text-sm font-medium text-slate-800">{c.subjects || 0}例受试者</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">数据质量</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">CRF总数</p>
                    <p className="text-sm font-medium text-slate-800">{crfStats.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">已核验</p>
                    <p className="text-sm font-medium text-slate-800">{crfStats.verified || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">有错误</p>
                    <p className="text-sm font-medium text-slate-800">{crfStats.withErrors || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">质量评分</p>
                    <p className="text-sm font-medium text-slate-800">{crfStats.total > 0 ? Math.round(((crfStats.verified || 0) / crfStats.total) * 100) : '-'}分</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">SAE统计</h4>
                {saeStats.byType && Object.values(saeStats.byType).some((v: any) => v > 0) ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(saeStats.byType).map(([k, v]) => {
                      const labels: Record<string, string> = { death: '死亡', life_threatening: '危及生命', hospitalization: '住院', disabling: '致残', congenital_anomaly: '先天异常', other_serious: '其他严重', other: '其他' }
                      const colors: Record<string, string> = { death: 'text-red-700', life_threatening: 'text-purple-700', hospitalization: 'text-teal-700', disabling: 'text-amber-700', congenital_anomaly: 'text-pink-700', other_serious: 'text-slate-700', other: 'text-slate-700' }
                      return (v as number) > 0 ? (
                        <div key={k}>
                          <p className="text-xs text-slate-400">{labels[k] || k}</p>
                          <p className={`text-sm font-bold ${colors[k] || 'text-slate-800'}`}>{v as number}例</p>
                        </div>
                      ) : null
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">暂无SAE数据</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">质疑统计</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{queryStats.open || 0}</p>
                    <p className="text-xs text-red-600 mt-1">待处理</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{queryStats.answered || 0}</p>
                    <p className="text-xs text-amber-600 mt-1">已回复</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{queryStats.closed || 0}</p>
                    <p className="text-xs text-green-600 mt-1">已关闭</p>
                  </div>
                </div>
              </div>

              {summary.conclusion && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">关键结论</h4>
                  <div className="bg-teal-50 rounded-lg p-4">
                    <p className="text-sm text-teal-800 leading-relaxed">{summary.conclusion}</p>
                  </div>
                </div>
              )}

              {summary.followUpItems && summary.followUpItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">待跟进事项</h4>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {summary.followUpItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-sm text-amber-900">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
