import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileCheck,
  PenTool,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import type { Consent, Subject, Trial } from '@/types'

function SignaturePad({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  label: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    setDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e293b'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const endDraw = () => {
    if (!drawing) return
    setDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      onChange(canvas.toDataURL())
    }
  }

  const clearPad = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {!disabled && value && (
          <button
            onClick={clearPad}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            清除
          </button>
        )}
      </div>
      <div className="relative border-2 border-dashed border-slate-200 rounded-lg overflow-hidden bg-white">
        {disabled && value ? (
          <img src={value} alt={label} className="w-full h-32 object-contain" />
        ) : (
          <canvas
            ref={canvasRef}
            width={400}
            height={128}
            className="w-full h-32 cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        )}
        {!value && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <PenTool className="w-5 h-5 text-slate-300" />
            <span className="text-sm text-slate-300 ml-2">请在此处签名</span>
          </div>
        )}
      </div>
    </div>
  )
}

type ConsentStatus = 'unsigned' | 'partial' | 'signed' | 'locked'

export default function ConsentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [trial, setTrial] = useState<Trial | null>(null)
  const [consent, setConsent] = useState<Consent | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjectSig, setSubjectSig] = useState('')
  const [investigatorSig, setInvestigatorSig] = useState('')
  const [signingSubject, setSigningSubject] = useState(false)
  const [signingInvestigator, setSigningInvestigator] = useState(false)
  const [locking, setLocking] = useState(false)
  const [showLockModal, setShowLockModal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const consentStatus: ConsentStatus = consent
    ? consent.isLocked
      ? 'locked'
      : consent.subjectSignature && consent.investigatorSignature
      ? 'signed'
      : consent.subjectSignature || consent.investigatorSignature
      ? 'partial'
      : 'unsigned'
    : 'unsigned'

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get<Subject>(`/subjects/${id}`),
      api.get<Consent>(`/consent/${id}`),
    ]).then(([subjectRes, consentRes]) => {
      if (subjectRes.success && subjectRes.data) {
        setSubject(subjectRes.data)
        api.get<Trial>(`/trials/${subjectRes.data.trialId}`).then((r) => {
          if (r.success && r.data) setTrial(r.data)
        })
      }
      if (consentRes.success && consentRes.data) {
        setConsent(consentRes.data)
        if (consentRes.data.subjectSignature) setSubjectSig(consentRes.data.subjectSignature)
        if (consentRes.data.investigatorSignature)
          setInvestigatorSig(consentRes.data.investigatorSignature)
      }
      setLoading(false)
    })
  }, [id])

  const handleSignSubject = async () => {
    if (!subjectSig || !id) return
    setSigningSubject(true)
    const res = await api.post<Consent>('/consent/sign', {
      subjectId: id,
      type: 'subject',
      signature: subjectSig,
    })
    if (res.success && res.data) {
      setConsent(res.data)
      showToast('success', '受试者签名已保存')
    } else {
      showToast('error', res.error || '签名保存失败')
    }
    setSigningSubject(false)
  }

  const handleSignInvestigator = async () => {
    if (!investigatorSig || !id) return
    setSigningInvestigator(true)
    const res = await api.post<Consent>('/consent/sign', {
      subjectId: id,
      type: 'investigator',
      signature: investigatorSig,
    })
    if (res.success && res.data) {
      setConsent(res.data)
      showToast('success', '研究者签名已保存')
    } else {
      showToast('error', res.error || '签名保存失败')
    }
    setSigningInvestigator(false)
  }

  const handleLock = async () => {
    if (!consent) return
    setLocking(true)
    const res = await api.put<Consent>(`/consent/${consent.id}/lock`)
    if (res.success && res.data) {
      setConsent(res.data)
      showToast('success', '知情同意书已锁定')
    } else {
      showToast('error', res.error || '锁定失败')
    }
    setLocking(false)
    setShowLockModal(false)
  }

  const isLocked = consentStatus === 'locked'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/subjects/${id}`)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">知情同意书</h1>
            <p className="text-sm text-slate-400">
              {subject?.name} - {trial?.name || ''}
            </p>
          </div>
        </div>
        <StatusBadge status={consentStatus} type="consent" />
      </div>

      <div className="flex gap-6" style={{ minHeight: 600 }}>
        <div className="w-[60%] shrink-0">
          <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden h-full">
            <div className="bg-slate-50 px-4 py-2 border-b border-[var(--border)] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-slate-400 ml-2">知情同意书预览</span>
            </div>
            <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar" style={{
              background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
            }}>
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-10 max-w-lg mx-auto">
                <h2 className="text-center text-lg font-bold text-slate-800 mb-1">
                  临床试验知情同意书
                </h2>
                <p className="text-center text-sm text-slate-500 mb-6">
                  {trial?.name || '试验项目'}
                </p>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                  <div>
                    <h3 className="font-bold text-slate-800 mb-2">一、试验基本信息</h3>
                    <p>试验名称：{trial?.name || '—'}</p>
                    <p>试验分期：{trial?.phase || '—'}</p>
                    <p>受试者姓名：{subject?.name || '—'}</p>
                    <p>受试者编号：{subject?.id || '—'}</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 mb-2">二、试验目的</h3>
                    <p>
                      本临床试验旨在评估试验药物在目标适应症人群中的安全性和有效性，
                      为药物注册上市提供科学依据。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 mb-2">三、试验程序</h3>
                    <p>
                      您将按照试验方案的要求参加筛选期访视、治疗期访视和随访期访视。
                      每次访视将进行相应的检查和评估，包括体格检查、实验室检查、
                      心电图等。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 mb-2">四、可能的风险和不适</h3>
                    <p>
                      参与本试验可能存在一定风险，包括但不限于：药物不良反应、
                      静脉采血带来的不适、额外的检查和时间成本等。研究团队将
                      密切监测您的安全状况。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 mb-2">五、受试者权利</h3>
                    <p>
                      您有权在任何时候退出本试验而不会受到任何处罚或影响您的常规治疗。
                      您的个人隐私将得到严格保护。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 mb-2">六、受益与补偿</h3>
                    <p>
                      参与本试验，您可能获得试验药物的潜在治疗效益，同时将为医学发展
                      做出贡献。试验相关的检查和治疗费用由申办方承担。
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-400">
                      本人已仔细阅读并理解以上内容，自愿参加本临床试验。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-[40%] space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-700">签署状态</h3>
              <StatusBadge status={consentStatus} type="consent" />
            </div>

            {isLocked && (
              <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg mb-4">
                <Lock className="w-4 h-4 text-teal-700" />
                <span className="text-sm text-teal-700 font-medium">知情同意书已锁定，不可修改</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700 font-medium">受试者签名</span>
                  {consent?.subjectSignature && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <SignaturePad
                  value={subjectSig}
                  onChange={setSubjectSig}
                  disabled={isLocked}
                  label=""
                />
                {!isLocked && (
                  <button
                    onClick={handleSignSubject}
                    disabled={!subjectSig || signingSubject}
                    className={cn(
                      'mt-2 w-full py-2 rounded-lg text-sm font-medium transition-colors',
                      subjectSig && !signingSubject
                        ? 'bg-teal-700 text-white hover:bg-teal-800'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {signingSubject ? '保存中...' : '签署（受试者）'}
                  </button>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700 font-medium">研究者签名</span>
                  {consent?.investigatorSignature && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <SignaturePad
                  value={investigatorSig}
                  onChange={setInvestigatorSig}
                  disabled={isLocked}
                  label=""
                />
                {!isLocked && (
                  <button
                    onClick={handleSignInvestigator}
                    disabled={!investigatorSig || signingInvestigator}
                    className={cn(
                      'mt-2 w-full py-2 rounded-lg text-sm font-medium transition-colors',
                      investigatorSig && !signingInvestigator
                        ? 'bg-teal-700 text-white hover:bg-teal-800'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {signingInvestigator ? '保存中...' : '签署（研究者）'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {!isLocked && consent?.subjectSignature && consent?.investigatorSignature && (
            <button
              onClick={() => setShowLockModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Lock className="w-4 h-4" />
              锁定知情同意
            </button>
          )}
        </div>
      </div>

      {showLockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">确认锁定</h3>
                <p className="text-sm text-slate-500">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              锁定后知情同意书将无法修改或重新签署，请确认所有签名信息准确无误。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLock}
                disabled={locking}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {locking ? '锁定中...' : '确认锁定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 animate-bounce',
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}
