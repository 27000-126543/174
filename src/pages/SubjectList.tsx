import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, Plus, ChevronLeft, ChevronRight, Eye, Pencil, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import type { Subject, Trial } from '@/types'

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'enrolled', label: '已报名' },
  { value: 'screening', label: '筛选中' },
  { value: 'eligible', label: '符合条件' },
  { value: 'consented', label: '已知情同意' },
  { value: 'randomized', label: '已随机' },
  { value: 'active', label: '在治' },
  { value: 'completed', label: '已完成' },
  { value: 'withdrawn', label: '退出' },
]

const genderOptions: { value: string; label: string }[] = [
  { value: '', label: '全部性别' },
  { value: '男', label: '男' },
  { value: '女', label: '女' },
]

export default function SubjectList() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [trials, setTrials] = useState<Trial[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [trialFilter, setTrialFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  useEffect(() => {
    api.get<Trial[]>('/trials').then((res) => {
      if (res.success && res.data) setTrials(res.data)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (genderFilter) params.set('gender', genderFilter)
    if (trialFilter) params.set('trialId', trialFilter)

    api.get<{ items: Subject[]; total: number }>(`/subjects?${params.toString()}`).then((res) => {
      if (res.success && res.data) {
        setSubjects(res.data.items || [])
        setTotal(res.data.total || 0)
      }
      setLoading(false)
    })
  }, [page, search, statusFilter, genderFilter, trialFilter])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-teal-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">受试者管理</h1>
        </div>
        <button
          onClick={() => navigate('/subjects/enroll')}
          className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增报名
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索受试者姓名、ID或电话..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={genderFilter}
            onChange={(e) => { setGenderFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
          >
            {genderOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={trialFilter}
            onChange={(e) => { setTrialFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
          >
            <option value="">全部试验</option>
            {trials.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-base font-medium text-slate-600 mb-1">暂无受试者数据</h3>
            <p className="text-sm text-slate-400 mb-4">请尝试调整筛选条件或新增受试者</p>
            <button
              onClick={() => navigate('/subjects/enroll')}
              className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增报名
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>姓名</th>
                    <th>性别</th>
                    <th>年龄</th>
                    <th>试验</th>
                    <th>状态</th>
                    <th>联系电话</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/subjects/${s.id}`)}
                    >
                      <td className="font-mono text-xs text-slate-500">{s.id}</td>
                      <td className="font-medium text-slate-800">{s.name}</td>
                      <td>{s.gender}</td>
                      <td>{s.age}</td>
                      <td className="max-w-[150px] truncate">
                        {trials.find((t) => t.id === s.trialId)?.name || s.trialId}
                      </td>
                      <td>
                        <StatusBadge status={s.status} type="subject" />
                      </td>
                      <td className="text-slate-500">{s.phone}</td>
                      <td>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/subjects/${s.id}`)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                            title="查看"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <span className="text-sm text-slate-500">
                共 {total} 条记录，第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    page <= 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        page === pageNum
                          ? 'bg-teal-700 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    page >= totalPages
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
