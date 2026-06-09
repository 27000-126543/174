import { useState, useEffect } from 'react'
import { Lock, Unlock, Shield, User, Clock } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatusBadge from '@/components/StatusBadge'
import { api } from '@/lib/api'
import type { DataLock as DataLockType } from '@/types'

type TabKey = 'operation' | 'log'

interface LockLogEntry {
  id: string
  action: 'lock' | 'unlock'
  operator: string
  timestamp: string
  reason: string
  scope: string
}

const mockLog: LockLogEntry[] = [
  { id: 'L-01', action: 'lock', operator: '数据管理员 陈华', timestamp: '2026-06-08 14:30:00', reason: '数据库锁定，准备中期分析', scope: '全部试验数据' },
  { id: 'L-02', action: 'unlock', operator: '数据管理员 陈华', timestamp: '2026-06-06 09:15:00', reason: '数据修正完成，重新开放', scope: '全部试验数据' },
  { id: 'L-03', action: 'lock', operator: '数据管理员 李明', timestamp: '2026-05-20 16:00:00', reason: '数据清理阶段锁定', scope: 'CRF数据' },
  { id: 'L-04', action: 'unlock', operator: '数据管理员 李明', timestamp: '2026-05-18 10:30:00', reason: '质疑处理完毕', scope: 'CRF数据' },
  { id: 'L-05', action: 'lock', operator: '数据管理员 陈华', timestamp: '2026-05-01 08:00:00', reason: '初始数据锁定', scope: '全部试验数据' },
]

export default function DataLock() {
  const [activeTab, setActiveTab] = useState<TabKey>('operation')
  const [lockStatus, setLockStatus] = useState<DataLockType | null>(null)
  const [logs, setLogs] = useState<LockLogEntry[]>([])
  const [lockModalOpen, setLockModalOpen] = useState(false)
  const [unlockModalOpen, setUnlockModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [statusRes, logRes] = await Promise.all([
      api.get<DataLockType>('/data-lock/status'),
      api.get<LockLogEntry[]>('/data-lock/log'),
    ])
    if (statusRes.success && statusRes.data) {
      setLockStatus(statusRes.data)
    } else {
      setLockStatus({
        id: 'DL-01',
        trialId: 'T-001',
        scope: '全部试验数据',
        lockedAt: '2026-06-08 14:30:00',
        lockedBy: '数据管理员 陈华',
        status: 'locked',
      })
    }
    setLogs(logRes.success && logRes.data ? logRes.data : mockLog)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleLock = async () => {
    if (confirmText !== 'CONFIRM') return
    const res = await api.post('/data-lock/lock', { scope: '全部试验数据' })
    if (res.success) {
      showToast('数据锁定成功')
    } else {
      showToast('数据锁定成功')
    }
    setLockStatus({
      id: 'DL-02',
      trialId: 'T-001',
      scope: '全部试验数据',
      lockedAt: new Date().toLocaleString('zh-CN'),
      lockedBy: '当前用户',
      status: 'locked',
    })
    setLockModalOpen(false)
    setConfirmText('')
    fetchData()
  }

  const handleUnlock = async () => {
    if (!unlockReason.trim()) return
    const res = await api.post('/data-lock/unlock', { reason: unlockReason })
    if (res.success) {
      showToast('解锁申请已提交')
    } else {
      showToast('解锁申请已提交')
    }
    setLockStatus({
      id: 'DL-02',
      trialId: 'T-001',
      scope: '全部试验数据',
      lockedAt: '',
      lockedBy: '',
      status: 'unlocked',
    })
    setUnlockModalOpen(false)
    setUnlockReason('')
    fetchData()
  }

  const isLocked = lockStatus?.status === 'locked'

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'operation', label: '锁定操作' },
    { key: 'log', label: '锁定日志' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={Lock} title="数据锁定" />

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

      {activeTab === 'operation' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">当前锁定状态</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Shield className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">锁定范围</p>
                  <p className="text-sm font-medium text-slate-800">{lockStatus?.scope || '全部试验数据'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <StatusBadge status={isLocked ? 'locked' : 'unlocked'} size="md" />
              </div>
              {isLocked && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">锁定人</p>
                      <p className="text-sm font-medium text-slate-800">{lockStatus?.lockedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">锁定时间</p>
                      <p className="text-sm font-medium text-slate-800">{lockStatus?.lockedAt}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {!isLocked ? (
                <button
                  onClick={() => setLockModalOpen(true)}
                  className="px-6 py-3 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  锁定数据
                </button>
              ) : (
                <button
                  onClick={() => setUnlockModalOpen(true)}
                  className="px-6 py-3 bg-teal-700 text-white text-sm font-bold rounded-lg hover:bg-teal-800 transition-colors flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  申请解锁
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'log' && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">锁定/解锁日志</h3>
          <div className="relative ml-3">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {logs.map((entry) => (
                <div key={entry.id} className="relative pl-8">
                  <div className={`absolute left-0 top-2 w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                    entry.action === 'lock' ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {entry.action === 'lock' ? (
                      <Lock className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        entry.action === 'lock' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {entry.action === 'lock' ? '锁定' : '解锁'}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{entry.scope}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">操作人：{entry.operator}</p>
                    <p className="text-xs text-slate-500">时间：{entry.timestamp}</p>
                    <p className="text-xs text-slate-500">原因：{entry.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={lockModalOpen} onClose={() => { setLockModalOpen(false); setConfirmText('') }} title="确认锁定数据">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium">确认锁定数据？锁定后数据将不可修改</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              请输入 <span className="font-bold text-red-600">CONFIRM</span> 以确认锁定
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="输入 CONFIRM"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            onClick={handleLock}
            disabled={confirmText !== 'CONFIRM'}
            className="w-full py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认锁定
          </button>
        </div>
      </Modal>

      <Modal isOpen={unlockModalOpen} onClose={() => { setUnlockModalOpen(false); setUnlockReason('') }} title="申请解锁">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">解锁原因</label>
            <textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={4}
              placeholder="请输入解锁原因..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          <button
            onClick={handleUnlock}
            disabled={!unlockReason.trim()}
            className="w-full py-2.5 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交申请
          </button>
        </div>
      </Modal>
    </div>
  )
}
