import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Send, Users, AlertTriangle, Award } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import { api } from '@/lib/api'

interface PerformanceData {
  month: number
  year: number
  enrollmentProgress: number
  qualityScore: number
  aeRate: number
  aeTrend: number
  centers: CenterData[]
}

interface CenterData {
  name: string
  enrolled: number
  queries: number
  sae: number
  qualityScore: number
}

const mockData: PerformanceData = {
  month: 6,
  year: 2026,
  enrollmentProgress: 78,
  qualityScore: 87,
  aeRate: 5.2,
  aeTrend: -0.8,
  centers: [
    { name: '中心1 - 北京协和', enrolled: 32, queries: 5, sae: 1, qualityScore: 92 },
    { name: '中心2 - 上海瑞金', enrolled: 28, queries: 8, sae: 2, qualityScore: 88 },
    { name: '中心3 - 广州中山', enrolled: 26, queries: 3, sae: 0, qualityScore: 90 },
    { name: '中心4 - 成都华西', enrolled: 22, queries: 6, sae: 1, qualityScore: 85 },
    { name: '中心5 - 武汉同济', enrolled: 20, queries: 4, sae: 1, qualityScore: 82 },
  ],
}

const centerRadarOption = {
  tooltip: {},
  legend: { bottom: 0, textStyle: { color: '#64748b' } },
  radar: {
    indicator: [
      { name: '入组率', max: 100 },
      { name: '数据质量', max: 100 },
      { name: '及时性', max: 100 },
      { name: '依从性', max: 100 },
    ],
    axisName: { color: '#475569' },
  },
  series: [{
    type: 'radar' as const,
    data: [
      {
        value: [85, 92, 78, 88],
        name: '中心1 - 北京协和',
        areaStyle: { color: 'rgba(15, 118, 110, 0.15)' },
        lineStyle: { color: '#0F766E' },
        itemStyle: { color: '#0F766E' },
      },
      {
        value: [72, 88, 82, 76],
        name: '中心2 - 上海瑞金',
        areaStyle: { color: 'rgba(217, 119, 6, 0.15)' },
        lineStyle: { color: '#D97706' },
        itemStyle: { color: '#D97706' },
      },
      {
        value: [68, 90, 85, 80],
        name: '中心3 - 广州中山',
        areaStyle: { color: 'rgba(220, 38, 38, 0.15)' },
        lineStyle: { color: '#DC2626' },
        itemStyle: { color: '#DC2626' },
      },
    ],
  }],
}

const enrollmentTrendOption = {
  tooltip: { trigger: 'axis' as const },
  xAxis: {
    type: 'category' as const,
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    axisLabel: { color: '#64748b' },
  },
  yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' } },
  series: [{
    data: [12, 30, 52, 80, 108, 128],
    type: 'line' as const,
    smooth: true,
    itemStyle: { color: '#0F766E' },
    lineStyle: { width: 2 },
    areaStyle: { color: 'rgba(15, 118, 110, 0.1)' },
  }],
  grid: { top: 20, right: 20, bottom: 30, left: 50 },
}

const qualityTrendOption = {
  tooltip: { trigger: 'axis' as const },
  xAxis: {
    type: 'category' as const,
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    axisLabel: { color: '#64748b' },
  },
  yAxis: { type: 'value' as const, min: 70, max: 100, axisLabel: { color: '#64748b' } },
  series: [{
    data: [78, 82, 84, 86, 85, 87],
    type: 'line' as const,
    smooth: true,
    itemStyle: { color: '#D97706' },
    lineStyle: { width: 2 },
    areaStyle: { color: 'rgba(217, 119, 6, 0.1)' },
  }],
  grid: { top: 20, right: 20, bottom: 30, left: 50 },
}

const gaugeOption = (value: number) => ({
  series: [{
    type: 'gauge' as const,
    startAngle: 200,
    endAngle: -20,
    min: 0,
    max: 100,
    pointer: { show: false },
    progress: {
      show: true,
      overlap: false,
      roundCap: true,
      clip: false,
      itemStyle: { color: '#0F766E' },
    },
    axisLine: { lineStyle: { width: 12, color: [[1, '#E2E8F0']] } },
    splitNumber: 0,
    axisTick: { show: false },
    axisLabel: { show: false },
    detail: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#0F766E',
      offsetCenter: [0, 0],
      formatter: '{value}',
    },
    data: [{ value }],
  }],
})

const months = Array.from({ length: 12 }, (_, i) => i + 1)
const years = [2025, 2026]

export default function Performance() {
  const [data, setData] = useState<PerformanceData>(mockData)
  const [selectedMonth, setSelectedMonth] = useState(6)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [pushModalOpen, setPushModalOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const res = await api.get<PerformanceData>(`/performance/monthly?year=${selectedYear}&month=${selectedMonth}`)
    if (res.success && res.data) setData(res.data)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handlePush = () => {
    showToast('绩效报告已推送至管理层手机端')
    setPushModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="绩效报告"
        action={
          <button
            onClick={() => setPushModalOpen(true)}
            className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            推送至管理层
          </button>
        }
      />

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-teal-700" />
            <span className="text-sm font-medium text-slate-700">入组进度</span>
          </div>
          <ReactECharts option={gaugeOption(data.enrollmentProgress)} style={{ height: 140 }} />
          <p className="text-xs text-slate-400 text-center mt-1">{data.enrollmentProgress}% 目标完成</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-slate-700">数据质量评分</span>
          </div>
          <ReactECharts option={gaugeOption(data.qualityScore)} style={{ height: 140 }} />
          <p className="text-xs text-slate-400 text-center mt-1">综合评分 {data.qualityScore}/100</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-slate-700">AE发生率</span>
          </div>
          <div className="flex items-center justify-center h-[140px]">
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-800">{data.aeRate}%</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {data.aeTrend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-xs font-medium ${data.aeTrend < 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {data.aeTrend > 0 ? '+' : ''}{data.aeTrend}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-3">中心对比</h4>
          <ReactECharts option={centerRadarOption} style={{ height: 300 }} />
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-3">入组趋势</h4>
          <ReactECharts option={enrollmentTrendOption} style={{ height: 300 }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-5">
        <h4 className="text-sm font-bold text-slate-800 mb-3">质量评分趋势</h4>
        <ReactECharts option={qualityTrendOption} style={{ height: 240 }} />
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-5">
        <h4 className="text-sm font-bold text-slate-800 mb-4">月度报告明细</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-500 font-medium">中心名称</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">入组数</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">质疑数</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">SAE数</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">质量评分</th>
              </tr>
            </thead>
            <tbody>
              {data.centers.map((center) => (
                <tr key={center.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-800 font-medium">{center.name}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{center.enrolled}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{center.queries}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      center.sae > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {center.sae}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      center.qualityScore >= 90 ? 'bg-green-50 text-green-600' :
                      center.qualityScore >= 80 ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {center.qualityScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={pushModalOpen} onClose={() => setPushModalOpen(false)} title="推送确认">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">确认将{selectedYear}年{selectedMonth}月绩效报告推送至管理层手机端？</p>
          <div className="flex gap-3">
            <button
              onClick={() => setPushModalOpen(false)}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handlePush}
              className="flex-1 py-2.5 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors"
            >
              确认推送
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
