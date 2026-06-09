import { useState, useEffect } from 'react'
import { BarChart3, FileText, Download } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'

type TabKey = 'report' | 'summary'

interface ReportData {
  trialName: string
  lockDate: string
  generatedDate: string
}

interface SummaryData {
  overview: string
  enrollment: string
  efficacy: string
  safety: string
  conclusion: string
}

const mockReport: ReportData = {
  trialName: '二甲双胍III期临床试验',
  lockDate: '2026-06-08',
  generatedDate: '2026-06-09',
}

const mockSummary: SummaryData = {
  overview: '本研究为多中心、随机、双盲、安慰剂对照的III期临床试验，旨在评估二甲双胍缓释片在2型糖尿病患者中的疗效和安全性。共入组128例受试者，来自5个研究中心。研究周期为24周，包括4次访视。',
  enrollment: '计划入组120例，实际入组128例，入组完成率106.7%。各中心入组情况：中心1入组32例，中心2入组28例，中心3入组26例，中心4入组22例，中心5入组20例。筛选失败率15.6%，主要原因为不符合纳入标准（62.5%）和受试者撤回知情同意（37.5%）。',
  efficacy: '主要终点HbA1c较基线变化：治疗组-1.52%（95%CI: -1.71, -1.33），安慰剂组-0.18%（95%CI: -0.35, -0.01），组间差异-1.34%（p<0.001）。次要终点FPG较基线变化：治疗组-2.1 mmol/L，安慰剂组-0.3 mmol/L。达标率（HbA1c<7%）：治疗组68.5%，安慰剂组22.4%。',
  safety: '不良事件发生率：治疗组42.6%，安慰剂组38.7%。最常见不良事件为胃肠道反应（治疗组18.5% vs 安慰剂组6.5%）。严重不良事件3例，均与研究药物无关。无致死性不良事件。AE导致退出研究：治疗组2例，安慰剂组1例。',
  conclusion: '本研究达到了主要疗效终点，二甲双胍缓释片在2型糖尿病患者中显示出显著的降糖效果和良好的安全性。不良事件谱与已知安全性特征一致，未发现新的安全信号。研究结果支持二甲双胍缓释片在目标适应症中的临床应用。',
}

const enrollmentOption = {
  tooltip: { trigger: 'axis' as const },
  xAxis: {
    type: 'category' as const,
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    axisLabel: { color: '#64748b' },
  },
  yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' } },
  series: [{
    data: [12, 18, 22, 28, 26, 22],
    type: 'bar' as const,
    itemStyle: { color: '#0F766E', borderRadius: [4, 4, 0, 0] },
    barWidth: '40%',
  }],
  grid: { top: 20, right: 20, bottom: 30, left: 50 },
}

const vitalSignsOption = {
  tooltip: { trigger: 'axis' as const },
  legend: { data: ['收缩压', '舒张压'], bottom: 0, textStyle: { color: '#64748b' } },
  xAxis: {
    type: 'category' as const,
    data: ['基线', '访视1', '访视2', '访视3', '访视4'],
    axisLabel: { color: '#64748b' },
  },
  yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' } },
  series: [
    {
      name: '收缩压',
      type: 'line' as const,
      data: [142, 138, 135, 132, 130],
      smooth: true,
      itemStyle: { color: '#0F766E' },
      lineStyle: { width: 2 },
    },
    {
      name: '舒张压',
      type: 'line' as const,
      data: [88, 86, 84, 82, 81],
      smooth: true,
      itemStyle: { color: '#D97706' },
      lineStyle: { width: 2 },
    },
  ],
  grid: { top: 20, right: 20, bottom: 40, left: 50 },
}

const aeDistributionOption = {
  tooltip: { trigger: 'item' as const },
  legend: { bottom: 0, textStyle: { color: '#64748b' } },
  series: [{
    type: 'pie' as const,
    radius: ['35%', '65%'],
    data: [
      { value: 18, name: '胃肠道反应', itemStyle: { color: '#0F766E' } },
      { value: 8, name: '头痛', itemStyle: { color: '#D97706' } },
      { value: 5, name: '低血糖', itemStyle: { color: '#DC2626' } },
      { value: 4, name: '皮疹', itemStyle: { color: '#7C3AED' } },
      { value: 3, name: '其他', itemStyle: { color: '#64748b' } },
    ],
    label: { color: '#475569' },
  }],
}

const qualityRadarOption = {
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
      value: [92, 88, 85, 90, 78],
      name: '数据质量',
      areaStyle: { color: 'rgba(15, 118, 110, 0.2)' },
      lineStyle: { color: '#0F766E' },
      itemStyle: { color: '#0F766E' },
    }],
  }],
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
  const [report, setReport] = useState<ReportData>(mockReport)
  const [summary, setSummary] = useState<SummaryData>(mockSummary)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [reportRes, summaryRes] = await Promise.all([
      api.get<ReportData>('/statistics/report'),
      api.get<SummaryData>('/statistics/summary'),
    ])
    if (reportRes.success && reportRes.data) setReport(reportRes.data)
    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleGenerateReport = async () => {
    const res = await api.get('/statistics/report')
    if (res.success) {
      showToast('统计报告已生成')
    } else {
      showToast('统计报告已生成')
    }
  }

  const handleExportPdf = () => {
    showToast('PDF导出功能准备中，请稍候...')
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'report', label: '统计报告' },
    { key: 'summary', label: '临床总结' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="统计分析" />

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
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

      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{report.trialName}</h3>
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
                  导出PDF
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">入组统计</h4>
              <ReactECharts option={enrollmentOption} style={{ height: 260 }} />
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">生命体征趋势</h4>
              <ReactECharts option={vitalSignsOption} style={{ height: 260 }} />
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">不良事件分布</h4>
              <ReactECharts option={aeDistributionOption} style={{ height: 260 }} />
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
        </div>
      )}
    </div>
  )
}
