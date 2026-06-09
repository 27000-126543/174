import { useState, useEffect } from 'react'
import { Shuffle, Plus, Minus, X, Pill } from 'lucide-react'
import { api } from '@/lib/api'

type TabKey = 'config' | 'list'

interface GroupConfig {
  name: string
  ratio: number
}

interface StratumFactor {
  id: string
  name: string
}

interface RandomizationEntry {
  id: string
  randomNumber: string
  subjectId: string | null
  subjectName: string | null
  group: string
  drugCode: string | null
  stratum: string
  assignedAt: string | null
  status: 'assigned' | 'unassigned'
}

interface Subject {
  id: string
  name: string
}

const mockEntries: RandomizationEntry[] = [
  { id: 'R-001', randomNumber: '001', subjectId: 'S-001', subjectName: '王明', group: '试验组', drugCode: 'D-001', stratum: '年龄≥60岁', assignedAt: '2026-06-01T10:00:00', status: 'assigned' },
  { id: 'R-002', randomNumber: '002', subjectId: 'S-002', subjectName: '李芳', group: '对照组', drugCode: 'D-002', stratum: '年龄<60岁', assignedAt: '2026-06-02T14:00:00', status: 'assigned' },
  { id: 'R-003', randomNumber: '003', subjectId: null, subjectName: null, group: '试验组', drugCode: null, stratum: '年龄≥60岁', assignedAt: null, status: 'unassigned' },
  { id: 'R-004', randomNumber: '004', subjectId: null, subjectName: null, group: '对照组', drugCode: null, stratum: '年龄<60岁', assignedAt: null, status: 'unassigned' },
  { id: 'R-005', randomNumber: '005', subjectId: 'S-003', subjectName: '张磊', group: '试验组', drugCode: 'D-005', stratum: '年龄<60岁', assignedAt: '2026-06-05T09:00:00', status: 'assigned' },
  { id: 'R-006', randomNumber: '006', subjectId: null, subjectName: null, group: '对照组', drugCode: null, stratum: '年龄≥60岁', assignedAt: null, status: 'unassigned' },
]

const mockSubjects: Subject[] = [
  { id: 'S-004', name: '赵敏' },
  { id: 'S-005', name: '陈强' },
  { id: 'S-006', name: '刘洋' },
  { id: 'S-007', name: '黄丽' },
]

export default function Randomization() {
  const [activeTab, setActiveTab] = useState<TabKey>('config')
  const [entries, setEntries] = useState<RandomizationEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [trialId, setTrialId] = useState('trial-001')
  const [groupCount, setGroupCount] = useState(2)
  const [groups, setGroups] = useState<GroupConfig[]>([
    { name: '试验组', ratio: 1 },
    { name: '对照组', ratio: 1 },
  ])
  const [blockSize, setBlockSize] = useState(4)
  const [stratums, setStratums] = useState<StratumFactor[]>([
    { id: '1', name: '年龄分层' },
    { id: '2', name: '性别分层' },
  ])
  const [generating, setGenerating] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState<RandomizationEntry[]>([])

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningEntry, setAssigningEntry] = useState<RandomizationEntry | null>(null)
  const [assignSubjectId, setAssignSubjectId] = useState('')
  const [assignDrugCode, setAssignDrugCode] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<RandomizationEntry[]>('/randomization/list')
        if (res.success && res.data) {
          setEntries(res.data)
        } else {
          setEntries(mockEntries)
        }
      } catch {
        setEntries(mockEntries)
      }
      setLoading(false)
    }
    fetchData()

    const fetchSubjects = async () => {
      try {
        const res = await api.get<Subject[]>('/subjects')
        if (res.success && res.data) {
          setSubjects(res.data)
        } else {
          setSubjects(mockSubjects)
        }
      } catch {
        setSubjects(mockSubjects)
      }
    }
    fetchSubjects()
  }, [])

  const handleGroupCountChange = (count: number) => {
    setGroupCount(count)
    const newGroups: GroupConfig[] = []
    for (let i = 0; i < count; i++) {
      if (groups[i]) {
        newGroups.push(groups[i])
      } else {
        newGroups.push({ name: `组${i + 1}`, ratio: 1 })
      }
    }
    setGroups(newGroups)
  }

  const handleGroupChange = (index: number, field: keyof GroupConfig, value: string | number) => {
    const newGroups = [...groups]
    newGroups[index] = { ...newGroups[index], [field]: value }
    setGroups(newGroups)
  }

  const addStratum = () => {
    setStratums((prev) => [...prev, { id: String(Date.now()), name: '' }])
  }

  const removeStratum = (id: string) => {
    setStratums((prev) => prev.filter((s) => s.id !== id))
  }

  const handleStratumChange = (id: string, name: string) => {
    setStratums((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await api.post<RandomizationEntry[]>('/randomization/generate', {
        trialId,
        groups,
        blockSize,
        stratums: stratums.map((s) => s.name).filter(Boolean),
      })
      if (res.success && res.data) {
        setGeneratedPreview(res.data)
      } else {
        const preview: RandomizationEntry[] = []
        for (let i = 0; i < 20; i++) {
          const groupIdx = i % groups.length
          preview.push({
            id: `R-NEW-${String(i + 1).padStart(3, '0')}`,
            randomNumber: String(i + 1).padStart(3, '0'),
            subjectId: null,
            subjectName: null,
            group: groups[groupIdx].name,
            drugCode: null,
            stratum: stratums[i % stratums.length]?.name || '',
            assignedAt: null,
            status: 'unassigned',
          })
        }
        setGeneratedPreview(preview)
      }
    } catch {
      const preview: RandomizationEntry[] = []
      for (let i = 0; i < 20; i++) {
        const groupIdx = i % groups.length
        preview.push({
          id: `R-NEW-${String(i + 1).padStart(3, '0')}`,
          randomNumber: String(i + 1).padStart(3, '0'),
          subjectId: null,
          subjectName: null,
          group: groups[groupIdx].name,
          drugCode: null,
          stratum: stratums[i % stratums.length]?.name || '',
          assignedAt: null,
          status: 'unassigned',
        })
      }
      setGeneratedPreview(preview)
    }
    setGenerating(false)
  }

  const openAssignModal = (entry: RandomizationEntry) => {
    setAssigningEntry(entry)
    setAssignSubjectId('')
    setAssignDrugCode('')
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (!assigningEntry || !assignSubjectId || !assignDrugCode) return
    setAssigning(true)
    try {
      const res = await api.post('/randomization/assign', {
        randomizationId: assigningEntry.id,
        subjectId: assignSubjectId,
        drugCode: assignDrugCode,
      })
      if (res.success) {
        const subjectName = subjects.find((s) => s.id === assignSubjectId)?.name || assignSubjectId
        setEntries((prev) =>
          prev.map((e) =>
            e.id === assigningEntry.id
              ? { ...e, subjectId: assignSubjectId, subjectName, drugCode: assignDrugCode, assignedAt: new Date().toISOString(), status: 'assigned' as const }
              : e
          )
        )
      }
    } catch {
      const subjectName = subjects.find((s) => s.id === assignSubjectId)?.name || assignSubjectId
      setEntries((prev) =>
        prev.map((e) =>
          e.id === assigningEntry.id
            ? { ...e, subjectId: assignSubjectId, subjectName, drugCode: assignDrugCode, assignedAt: new Date().toISOString(), status: 'assigned' as const }
            : e
        )
      )
    }
    setAssigning(false)
    setShowAssignModal(false)
  }

  const statusBadge = (status: string) => {
    if (status === 'assigned') return 'bg-green-50 text-green-600'
    return 'bg-slate-100 text-slate-500'
  }

  const statusLabel = (status: string) => {
    if (status === 'assigned') return '已分配'
    return '未分配'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Shuffle className="w-5 h-5 text-teal-700" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">随机化与药物管理</h1>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {([
          { key: 'config' as TabKey, label: '随机化配置' },
          { key: 'list' as TabKey, label: '随机号列表' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-teal-700 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-base font-bold text-slate-800 mb-6">配置参数</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">试验选择</label>
                  <select
                    value={trialId}
                    onChange={(e) => setTrialId(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="trial-001">试验A - 慢性肾病III期</option>
                    <option value="trial-002">试验B - 高血压II期</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">区组大小</label>
                  <input
                    type="number"
                    value={blockSize}
                    onChange={(e) => setBlockSize(parseInt(e.target.value) || 4)}
                    min={2}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">分组数量</label>
                <input
                  type="number"
                  value={groupCount}
                  onChange={(e) => handleGroupCountChange(parseInt(e.target.value) || 2)}
                  min={2}
                  max={6}
                  className="w-full max-w-xs border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">分组名称和比例</label>
                <div className="space-y-3">
                  {groups.map((g, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-slate-500 w-12">组{i + 1}</span>
                      <input
                        type="text"
                        value={g.name}
                        onChange={(e) => handleGroupChange(i, 'name', e.target.value)}
                        placeholder="分组名称"
                        className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <input
                        type="number"
                        value={g.ratio}
                        onChange={(e) => handleGroupChange(i, 'ratio', parseInt(e.target.value) || 1)}
                        min={1}
                        className="w-24 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <span className="text-xs text-slate-400">比例</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">分层因素</label>
                  <button
                    onClick={addStratum}
                    className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    添加分层
                  </button>
                </div>
                <div className="space-y-2">
                  {stratums.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => handleStratumChange(s.id, e.target.value)}
                        placeholder="分层因素名称"
                        className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <button
                        onClick={() => removeStratum(s.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              {generating ? '生成中...' : '生成随机号'}
            </button>
          </div>

          {generatedPreview.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="p-4 border-b border-[var(--border)]">
                <h2 className="text-base font-bold text-slate-800">生成结果预览</h2>
                <p className="text-xs text-slate-400 mt-1">共生成 {generatedPreview.length} 个随机号</p>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">随机号</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">分组</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">分层</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {generatedPreview.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{item.randomNumber}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-700">{item.group}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-500">{item.stratum || '-'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(item.status)}`}>
                            {statusLabel(item.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">随机号</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">受试者</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">分组</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">药物编号</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">分层</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">分配时间</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">状态</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">加载中...</td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">暂无数据</td>
                  </tr>
                ) : (
                  entries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.randomNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.subjectName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.group}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.drugCode || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.stratum || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {item.assignedAt
                          ? new Date(item.assignedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'unassigned' && (
                          <button
                            onClick={() => openAssignModal(item)}
                            className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-medium"
                          >
                            <Pill className="w-3.5 h-3.5" />
                            分配药物
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAssignModal && assigningEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">分配药物</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="space-y-1 text-sm text-slate-600">
                <p>随机号：{assigningEntry.randomNumber}</p>
                <p>分组：{assigningEntry.group}</p>
                <p>分层：{assigningEntry.stratum || '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">受试者选择 <span className="text-red-500">*</span></label>
                <select
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="">请选择受试者</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">药物编号 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={assignDrugCode}
                  onChange={(e) => setAssignDrugCode(e.target.value)}
                  placeholder="请输入药物编号"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || !assignSubjectId || !assignDrugCode}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {assigning ? '分配中...' : '确认分配'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
