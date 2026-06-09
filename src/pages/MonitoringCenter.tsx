import { useState, useEffect } from 'react'
import { Eye, Users, FileText, AlertTriangle, ClipboardCheck, BarChart3, Plus, Flag } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { api } from '@/lib/api'

type TabKey = 'overview' | 'anomalies' | 'tasks'

interface Center {
  id: string
  name: string
}

interface Anomaly {
  id: string
  subjectId: string
  subjectName: string
  type: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

interface MonitorTask {
  id: string
  title: string
  description: string
  assignedTo: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
}

const mockCenters: Center[] = [
  { id: 'c1', name: '北京协和中心' },
  { id: 'c2', name: '上海瑞金中心' },
  { id: 'c3', name: '广州中山中心' },
]

const mockAnomalies: Anomaly[] = [
  { id: 'AN-001', subjectId: 'S-001', subjectName: '王明', type: '离群值', description: '收缩压值180mmHg，超出正常范围3倍标准差', severity: 'high' },
  { id: 'AN-002', subjectId: 'S-005', subjectName: '陈强', type: '缺失数据', description: '访视3实验室检查结果缺失', severity: 'medium' },
  { id: 'AN-003', subjectId: 'S-008', subjectName: '刘洋', type: '时间不一致', description: '用药记录时间早于随机化时间', severity: 'high' },
  { id: 'AN-004', subjectId: 'S-012', subjectName: '黄丽', type: '离群值', description: '体重指数32，超出入选标准范围', severity: 'low' },
  { id: 'AN-005', subjectId: 'S-015', subjectName: '周伟', type: '缺失数据', description: '知情同意签署日期未录入', severity: 'medium' },
]

const mockTasks: MonitorTask[] = [
  { id: 'MT-001', title: '北京中心数据核查', description: '核查北京中心近3个月CRF数据完整性和一致性', assignedTo: '李监查员', status: 'in_progress', createdAt: '2026-06-07T10:00:00' },
  { id: 'MT-002', title: '异常值跟进', description: '跟进受试者S-001收缩压异常值，确认是否为真实数据', assignedTo: '王监查员', status: 'pending', createdAt: '2026-06-08T14:00:00' },
  { id: 'MT-003', title: '缺失数据催促', description: '催促S-005访视3实验室检查结果录入', assignedTo: '张监查员', status: 'pending', createdAt: '2026-06-09T09:00:00' },
  { id: 'MT-004', title: '上海中心SDV', description: '上海瑞金中心源数据核查', assignedTo: '李监查员', status: 'completed', createdAt: '2026-06-01T10:00:00' },
]

const severityColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-500',
}

const severityBadgeColors: Record<string, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-blue-50 text-blue-600',
}

const severityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const taskStatusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-green-50 text-green-600',
}

const taskStatusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
}

export default function MonitoringCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [centerId, setCenterId] = useState('c1')
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [tasks, setTasks] = useState<MonitorTask[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anomaliesRes, tasksRes] = await Promise.all([
          api.get<Anomaly[]>('/monitoring/anomalies'),
          api.get<MonitorTask[]>('/monitoring/tasks'),
        ])
        if (anomaliesRes.success && anomaliesRes.data) {
          setAnomalies(anomaliesRes.data)
        } else {
          setAnomalies(mockAnomalies)
        }
        if (tasksRes.success && tasksRes.data) {
          setTasks(tasksRes.data)
        } else {
          setTasks(mockTasks)
        }
      } catch {
        setAnomalies(mockAnomalies)
        setTasks(mockTasks)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const centerStats = [
    { label: '入组人数', value: 45, icon: Users, color: 'bg-teal-50 text-teal-700' },
    { label: 'CRF完成率', value: '87%', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: '质疑率', value: '5.2%', icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'SAE数量', value: 3, icon: Flag, color: 'bg-red-50 text-red-600' },
  ]

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: ['北京协和', '上海瑞金', '广州中山'],
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value' as const, axisLabel: { fontSize: 11 } },
    series: [
      {
        name: '入组人数',
        type: 'bar' as const,
        data: [45, 38, 32],
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#0F766E' },
              { offset: 1, color: '#5EEAD4' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '40%',
      },
    ],
    grid: { left: '10%', right: '5%', top: '10%', bottom: '15%' },
  }

  const gaugeOption = {
    series: [
      {
        type: 'gauge' as const,
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: { color: '#0F766E' },
        progress: { show: true, width: 18 },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 18, color: [[1, '#E2E8F0']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 'bold',
          color: '#0F766E',
          offsetCenter: [0, '0%'],
          formatter: '{value}%',
        },
        data: [{ value: 87 }],
      },
    ],
  }

  const handleGenerateTask = (anomaly: Anomaly) => {
    const newTask: MonitorTask = {
      id: `MT-${String(tasks.length + 1).padStart(3, '0')}`,
      title: `${anomaly.type}处理：${anomaly.subjectName}`,
      description: anomaly.description,
      assignedTo: '待分配',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [newTask, ...prev])
  }

  const handleTaskStatus = async (taskId: string, newStatus: 'in_progress' | 'completed') => {
    setActionLoading(true)
    try {
      const res = await api.put(`/monitoring/tasks/${taskId}`, { status: newStatus })
      if (res.success && res.data) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? (res.data as MonitorTask) : t)))
      } else {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
      }
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    }
    setActionLoading(false)
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: '数据概览', icon: BarChart3 },
    { key: 'anomalies', label: '异常记录', icon: AlertTriangle },
    { key: 'tasks', label: '监查任务', icon: ClipboardCheck },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Eye className="w-5 h-5 text-teal-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">监查中心</h1>
        </div>
        <select
          value={centerId}
          onChange={(e) => setCenterId(e.target.value)}
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
        >
          {mockCenters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-teal-700 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {centerStats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-[var(--border)] p-5">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--border)] p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4">各中心入组情况</h2>
              <ReactECharts option={barOption} style={{ height: '300px' }} />
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4">数据质量评分</h2>
              <ReactECharts option={gaugeOption} style={{ height: '300px' }} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">记录编号</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">受试者</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">异常类型</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">异常描述</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">严重程度</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">加载中...</td>
                  </tr>
                ) : anomalies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">暂无异常记录</td>
                  </tr>
                ) : (
                  anomalies.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 border-l-4 ${severityColors[item.severity]}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.subjectName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.type}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${severityBadgeColors[item.severity]}`}>
                          {severityLabels[item.severity]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleGenerateTask(item)}
                          className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-medium"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          生成监查任务
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center py-12 text-slate-400">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-400">暂无监查任务</div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">{task.title}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${taskStatusColors[task.status]}`}>
                    {taskStatusLabels[task.status]}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                  <span>负责人：{task.assignedTo}</span>
                  <span>创建：{new Date(task.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex gap-2">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleTaskStatus(task.id, 'in_progress')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-xs font-medium disabled:opacity-50"
                    >
                      开始处理
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => handleTaskStatus(task.id, 'completed')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50"
                    >
                      完成任务
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-xs text-green-600 font-medium">已完成</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
