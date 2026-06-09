import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Bell, X, ShieldCheck, ShieldX, Download, Send, Upload, AlertCircle, ChevronRight, FileUp } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const eventTypeLabels: Record<string, string> = {
  death: '死亡', life_threatening: '危及生命',
  hospitalization: '住院', disabling: '致残',
  congenital_anomaly: '先天异常', other_serious: '其他严重',
}

const severityLabels: Record<string, string> = {
  '1': '1级 - 轻度', '2': '2级 - 中度', '3': '3级 - 重度',
  '4': '4级 - 危及生命', '5': '5级 - 死亡',
  '严重': '严重', '危及生命': '危及生命', '死亡': '死亡',
}

const statusLabels: Record<string, string> = {
  reported: '已报告', under_review: '审查中', submitted: '已提交', closed: '已关闭',
}

const regulatoryStatusLabels: Record<string, string> = {
  pending: '待提交', submitted: '已提交监管', acknowledged: '监管已确认',
}

const nextActionLabels: Record<string, string> = {
  reported: '进入伦理审查', under_review: '提交监管机构',
  submitted: '等待监管确认', closed: '已完成',
}

interface SAEData {
  id: string
  subjectId: string
  subjectName?: string
  subjectCode?: string
  eventType: string
  description: string
  onsetDate: string
  reportDate: string
  deadline: string
  status: string
  causality?: string
  severity?: string
  assigneeName?: string
  assigneeId?: number
  nextAction?: string
  regulatoryStatus?: string
  regulatoryStatusLabel?: string
  processingRecords?: { time: string; action: string; operator: string; detail?: string }[]
  escalationRecords?: { time: string; reason: string; fromLevel: string; toLevel: string; operator: string }[]
  materials?: { id: number; name: string; description: string; uploadedAt: string; uploadedBy: number }[]
}

function formatCountdown(deadline: string): { text: string; color: string; overdue: boolean; urgent: boolean } {
  const now = new Date().getTime()
  const dl = new Date(deadline).getTime()
  const diff = dl - now
  if (diff <= 0) return { text: '已超期', color: 'text-red-600', overdue: true, urgent: true }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return { text: `${days}天${hours}时`, color: hours < 24 && days <= 1 ? 'text-amber-600' : 'text-green-600', overdue: false, urgent: days <= 2 }
  if (hours < 24) return { text: `${hours}小时`, color: 'text-amber-600', overdue: false, urgent: true }
  return { text: `${hours}小时`, color: 'text-green-600', overdue: false, urgent: false }
}

function buildCertLines(c: any): string[] {
  return [
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
}

export default function SAEDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [data, setData] = useState<SAEData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [disposalOpinion, setDisposalOpinion] = useState('')
  const [materialName, setMaterialName] = useState('')
  const [materialDesc, setMaterialDesc] = useState('')
  const [escalateReason, setEscalateReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showEscalateModal, setShowEscalateModal] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get<any>(`/sae/${id}`)
      if (res.success && res.data) {
        const d = res.data
        setData({
          id: String(d.id),
          subjectId: String(d.subjectId),
          subjectName: d.subjectName,
          subjectCode: d.subjectCode,
          eventType: d.eventType,
          description: d.description,
          onsetDate: d.onsetDate,
          reportDate: d.reportDate,
          deadline: d.deadline,
          status: d.status,
          causality: d.causality,
          severity: d.severity,
          assigneeName: d.assigneeName,
          assigneeId: d.assigneeId,
          nextAction: d.nextAction,
          regulatoryStatus: d.regulatoryStatus,
          regulatoryStatusLabel: d.regulatoryStatusLabel,
          processingRecords: d.processingRecords || [],
          escalationRecords: d.escalationRecords || [],
          materials: d.materials || [],
        })
      }
    } catch {}
    setLoading(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const countdown = useMemo(() => {
    if (!data?.deadline) return null
    return formatCountdown(data.deadline)
  }, [data?.deadline])

  const isDM = user?.role === 'dm'
  const isEC = user?.role === 'ec'
  const sevLabel = data?.severity || ''
  const sevNum = parseInt(sevLabel) || 0
  const sevColor = sevNum >= 4 || sevLabel.includes('危及') || sevLabel.includes('死亡') ? 'bg-red-500' : sevNum === 3 || sevLabel.includes('严重') ? 'bg-amber-500' : 'bg-green-500'

  const handleDownloadCertificate = async () => {
    if (!id) return
    setDownloading(true)
    try {
      const res = await api.get<any>(`/sae/certificate/${id}`)
      if (res.success && res.data) {
        const lines = buildCertLines(res.data)
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${res.data.certificateId}.txt`
        a.click()
        URL.revokeObjectURL(url)
        showToast('凭证下载成功')
      }
    } catch {}
    setDownloading(false)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await api.put(`/sae/${id}/status`, { status: newStatus })
      if (res.success && res.data) {
        await fetchData()
        showToast('状态已更新')
      }
    } catch {}
    setActionLoading(false)
    setShowRejectModal(false)
  }

  const handleDisposal = async () => {
    if (!id || !disposalOpinion.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post(`/sae/${id}/disposal`, { opinion: disposalOpinion.trim() })
      if (res.success) {
        setDisposalOpinion('')
        await fetchData()
        showToast('处置意见已提交')
      }
    } catch {}
    setActionLoading(false)
  }

  const handleUploadMaterial = async () => {
    if (!id || !materialName.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post(`/sae/${id}/material`, { name: materialName.trim(), description: materialDesc.trim() })
      if (res.success) {
        setMaterialName('')
        setMaterialDesc('')
        await fetchData()
        showToast('材料已上传')
      }
    } catch {}
    setActionLoading(false)
  }

  const handleRegulatoryStatus = async (status: string) => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await api.put(`/sae/${id}/regulatory-status`, { regulatoryStatus: status })
      if (res.success) {
        await fetchData()
        showToast('监管状态已更新')
      }
    } catch {}
    setActionLoading(false)
  }

  const handleRemind = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await api.post(`/sae/${id}/remind`)
      if (res.success) {
        await fetchData()
        showToast('催办通知已发送')
      }
    } catch {}
    setActionLoading(false)
  }

  const handleEscalate = async () => {
    if (!id || !escalateReason.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post(`/sae/${id}/escalate`, { reason: escalateReason.trim() })
      if (res.success) {
        setEscalateReason('')
        setShowEscalateModal(false)
        await fetchData()
        showToast('已升级处理')
      }
    } catch {}
    setActionLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-slate-400">加载中...</p></div>
  }

  if (!data) {
    return <div className="flex items-center justify-center py-20"><p className="text-slate-400">未找到数据</p></div>
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sae')} className="flex items-center gap-1 text-slate-500 hover:text-teal-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-red-600 rounded-full" />
        <h1 className="text-xl font-bold text-slate-800">SAE详情</h1>
        <span className="text-sm text-slate-500 ml-2">SAE-{data.id}</span>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] border-l-4 border-l-red-600 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">事件信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">受试者</p>
            <p className="text-sm font-medium text-slate-800">{data.subjectName || data.subjectId} {data.subjectCode ? `(${data.subjectCode})` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">事件类型</p>
            <p className="text-sm font-medium text-slate-800">{eventTypeLabels[data.eventType] || data.eventType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">严重程度</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${sevColor}`} />
              <span className="text-sm font-medium text-slate-800">{severityLabels[data.severity] || data.severity}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">因果关系</p>
            <p className="text-sm font-medium text-slate-800">{data.causality || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">发生时间</p>
            <p className="text-sm font-medium text-slate-800">{data.onsetDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">报告时间</p>
            <p className="text-sm font-medium text-slate-800">{data.reportDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">当前责任人</p>
            <p className="text-sm font-medium text-slate-800">{data.assigneeName || '未指定'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">下一步动作</p>
            <p className="text-sm font-medium text-teal-700">{data.nextAction || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">监管状态</p>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              data.regulatoryStatus === 'acknowledged' ? 'bg-green-100 text-green-700' :
              data.regulatoryStatus === 'submitted' ? 'bg-blue-100 text-blue-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {data.regulatoryStatusLabel || regulatoryStatusLabels[data.regulatoryStatus || 'pending']}
            </span>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-xs text-slate-500 mb-1">事件描述</p>
            <p className="text-sm text-slate-700">{data.description}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <button
              onClick={handleDownloadCertificate}
              disabled={downloading}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? '生成凭证中...' : '下载SAE报告凭证'}
            </button>
          </div>
        </div>
      </div>

      {countdown && (
        <div className={`rounded-xl border p-5 ${countdown.overdue ? 'bg-red-50 border-red-200' : countdown.urgent ? 'bg-amber-50 border-amber-200' : 'bg-white border-[var(--border)]'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className={`w-6 h-6 ${countdown.overdue ? 'text-red-600' : countdown.urgent ? 'text-amber-600' : 'text-teal-700'}`} />
              <div>
                <p className="text-sm text-slate-500">报告截止时间</p>
                <p className={`text-2xl font-bold ${countdown.color}`}>
                  {countdown.overdue ? '已超期' : countdown.text}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">截止：{data.deadline}</p>
              </div>
            </div>
            {isDM && data.status !== 'closed' && (
              <div className="flex gap-2">
                {!countdown.overdue && countdown.urgent && (
                  <button onClick={handleRemind} disabled={actionLoading} className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1 disabled:opacity-50">
                    <Send className="w-3 h-3" /> 催办
                  </button>
                )}
                {(countdown.overdue || countdown.urgent) && (
                  <button onClick={() => setShowEscalateModal(true)} disabled={actionLoading} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-50">
                    <AlertCircle className="w-3 h-3" /> 升级
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">处理记录</h2>
        {(data.processingRecords || []).length === 0 ? (
          <p className="text-sm text-slate-400">暂无处理记录</p>
        ) : (
          <div className="space-y-3">
            {data.processingRecords!.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{r.action}</span>
                    <span className="text-xs text-slate-400">{r.time}</span>
                  </div>
                  <p className="text-xs text-slate-500">操作人：{r.operator}</p>
                  {r.detail && <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded p-2">{r.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(data.escalationRecords || []).length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h2 className="text-base font-bold text-red-800 mb-4">升级记录</h2>
          <div className="space-y-3">
            {data.escalationRecords!.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{r.fromLevel} → {r.toLevel}</p>
                  <p className="text-xs text-red-600">{r.reason} ({r.time} · {r.operator})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.materials || []).length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">说明材料</h2>
          <div className="space-y-2">
            {data.materials!.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-teal-700" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{m.uploadedAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">推送通知记录</h2>
        <div className="space-y-3">
          {[
            { target: '伦理委员会', msg: `新的SAE报告待审查：受试者${data.subjectName || data.subjectId}`, time: data.reportDate },
            { target: '申办方', msg: `新SAE已上报，请关注：受试者${data.subjectName || data.subjectId}`, time: data.reportDate },
            { target: '监管机构', msg: `SAE通报：受试者${data.subjectName || data.subjectId}`, time: data.reportDate },
          ].map((n, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{n.target}</span>
                  <span className="text-xs text-slate-400">{n.time}</span>
                </div>
                <p className="text-sm text-slate-600">{n.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isDM && data.status !== 'closed' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">监管处置操作</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">补充处置意见</label>
                <div className="flex gap-2">
                  <input
                    value={disposalOpinion}
                    onChange={(e) => setDisposalOpinion(e.target.value)}
                    placeholder="输入处置意见..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-700"
                  />
                  <button onClick={handleDisposal} disabled={actionLoading || !disposalOpinion.trim()} className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 flex items-center gap-1">
                    <ChevronRight className="w-4 h-4" /> 提交
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">上传说明材料</label>
                <div className="flex gap-2">
                  <input
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    placeholder="材料名称"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-700"
                  />
                  <input
                    value={materialDesc}
                    onChange={(e) => setMaterialDesc(e.target.value)}
                    placeholder="说明（可选）"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-700"
                  />
                  <button onClick={handleUploadMaterial} disabled={actionLoading || !materialName.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                    <Upload className="w-4 h-4" /> 上传
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-2 block">更新监管提交状态</label>
                <div className="flex gap-2">
                  {(['pending', 'submitted', 'acknowledged'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleRegulatoryStatus(s)}
                      disabled={actionLoading || data.regulatoryStatus === s}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-40 ${
                        data.regulatoryStatus === s
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {regulatoryStatusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEC && (data.status === 'reported' || data.status === 'under_review') && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">审查操作</h2>
          <div className="flex gap-3">
            <button onClick={() => handleStatusUpdate('closed')} disabled={actionLoading} className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors text-sm font-medium disabled:opacity-50">
              <ShieldCheck className="w-4 h-4" /> 批准审查
            </button>
            <button onClick={() => setShowRejectModal(true)} disabled={actionLoading} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
              <ShieldX className="w-4 h-4" /> 驳回
            </button>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">驳回确认</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm font-medium text-red-700">确认驳回此SAE报告？</span></div>
              <p className="text-sm text-slate-600">驳回后需重新提交报告，该操作不可撤销。</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={() => handleStatusUpdate('reported')} disabled={actionLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
                {actionLoading ? '处理中...' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">升级处理</h3>
              <button onClick={() => setShowEscalateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-amber-600" /><span className="text-sm font-medium text-amber-700">升级后将通知申办方和伦理委员会</span></div>
              <p className="text-sm text-slate-600">请填写升级原因，此操作将发送升级通知给相关方。</p>
            </div>
            <textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="请输入升级原因..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-700 mb-4"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowEscalateModal(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleEscalate} disabled={actionLoading || !escalateReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
                {actionLoading ? '处理中...' : '确认升级'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
