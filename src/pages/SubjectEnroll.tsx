import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Check, PartyPopper } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Trial, ScreeningResult } from '@/types'

interface FormData {
  name: string
  gender: string
  age: string
  phone: string
  idNumber: string
  trialId: string
}

const initialForm: FormData = {
  name: '',
  gender: '男',
  age: '',
  phone: '',
  idNumber: '',
  trialId: '',
}

const steps = [
  { label: '基本信息', icon: '1' },
  { label: '入排标准筛选', icon: '2' },
  { label: '确认提交', icon: '3' },
]

export default function SubjectEnroll() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(initialForm)
  const [trials, setTrials] = useState<Trial[]>([])
  const [criteriaChecks, setCriteriaChecks] = useState<Record<string, boolean>>({})
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null)
  const [screening, setScreening] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<number[]>([])

  useEffect(() => {
    api.get<Trial[]>('/trials').then((res) => {
      if (res.success && res.data) setTrials(res.data)
    })
  }, [])

  const selectedTrial = trials.find((t) => t.id === form.trialId)

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleScreen = useCallback(async () => {
    if (!form.trialId) return
    setScreening(true)
    try {
      const res = await api.post<ScreeningResult>('/subjects/screen', {
        trialId: form.trialId,
        subjectData: form,
      })
      if (res.success && res.data) {
        setScreeningResult(res.data)
        const checks: Record<string, boolean> = {}
        res.data.details.forEach((d, i) => {
          checks[`criterion_${i}`] = d.passed
        })
        setCriteriaChecks(checks)
      }
    } finally {
      setScreening(false)
    }
  }, [form, form.trialId])

  useEffect(() => {
    if (step === 1 && form.trialId && !screeningResult) {
      handleScreen()
    }
  }, [step, form.trialId, screeningResult, handleScreen])

  const eligibilityScore = screeningResult
    ? Math.round(
        (screeningResult.details.filter((d) => d.passed).length /
          screeningResult.details.length) *
          100
      )
    : 0

  const allCriteriaChecked = selectedTrial
    ? [...(selectedTrial.inclusionCriteria || []), ...(selectedTrial.exclusionCriteria || [])].every(
        (_, i) => criteriaChecks[`criterion_${i}`] !== undefined
      )
    : false

  const isEligible = screeningResult?.eligible ?? false

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await api.post<ScreeningResult>('/subjects/enroll', {
        ...form,
        age: Number(form.age),
        screenResult: screeningResult,
      })
      if (res.success) {
        setShowSuccess(true)
        const pieces = Array.from({ length: 30 }, (_, i) => i)
        setConfettiPieces(pieces)
        setTimeout(() => setConfettiPieces([]), 3000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const step1Valid = form.name && form.gender && form.age && form.phone && form.trialId

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-teal-700" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">受试者入组</h1>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                    i < step
                      ? 'bg-teal-700 text-white'
                      : i === step
                      ? 'bg-teal-700 text-white ring-4 ring-teal-100'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {i < step ? <Check className="w-5 h-5" /> : s.icon}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    i <= step ? 'text-teal-700' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4',
                    i < step ? 'bg-teal-700' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="max-w-2xl space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">姓名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                placeholder="请输入受试者姓名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">性别</label>
              <div className="flex items-center gap-4">
                {['男', '女'].map((g) => (
                  <label
                    key={g}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors',
                      form.gender === g
                        ? 'border-teal-700 bg-teal-50 text-teal-700'
                        : 'border-[var(--border)] text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={form.gender === g}
                      onChange={(e) => updateField('gender', e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        form.gender === g ? 'border-teal-700' : 'border-slate-300'
                      )}
                    >
                      {form.gender === g && (
                        <div className="w-2 h-2 rounded-full bg-teal-700" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{g}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">年龄</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="请输入年龄"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">联系电话</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="请输入联系电话"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">身份证号</label>
              <input
                type="text"
                value={form.idNumber}
                onChange={(e) => updateField('idNumber', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                placeholder="请输入身份证号"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">选择试验</label>
              <select
                value={form.trialId}
                onChange={(e) => {
                  updateField('trialId', e.target.value)
                  setScreeningResult(null)
                  setCriteriaChecks({})
                }}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              >
                <option value="">请选择试验项目</option>
                {trials.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(1)}
                disabled={!step1Valid}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  step1Valid
                    ? 'bg-teal-700 text-white hover:bg-teal-800'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {screening ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-10 h-10 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-slate-500">正在进行入排标准筛选评估...</p>
              </div>
            ) : screeningResult ? (
              <>
                <div>
                  <h3 className="text-sm font-medium text-teal-700 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-teal-700 rounded-full" />
                    纳入标准
                  </h3>
                  <div className="space-y-2">
                    {screeningResult.details
                      .slice(0, selectedTrial?.inclusionCriteria?.length || 0)
                      .map((d, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border',
                            d.passed
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-red-200 bg-red-50/50'
                          )}
                        >
                          {d.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-slate-700">{d.criterion}</p>
                            {!d.passed && d.reason && (
                              <p className="text-xs text-red-500 mt-1">{d.reason}</p>
                            )}
                          </div>
                          <label className="flex items-center gap-2 shrink-0">
                            <input
                              type="checkbox"
                              checked={criteriaChecks[`criterion_${i}`] === true}
                              onChange={(e) =>
                                setCriteriaChecks((prev) => ({
                                  ...prev,
                                  [`criterion_${i}`]: e.target.checked,
                                }))
                              }
                              className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                            />
                            <span className="text-xs text-slate-500">符合</span>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-amber-600 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-amber-600 rounded-full" />
                    排除标准
                  </h3>
                  <div className="space-y-2">
                    {screeningResult.details
                      .slice(selectedTrial?.inclusionCriteria?.length || 0)
                      .map((d, i) => {
                        const idx = (selectedTrial?.inclusionCriteria?.length || 0) + i
                        return (
                          <div
                            key={i}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-lg border',
                              d.passed
                                ? 'border-green-200 bg-green-50/50'
                                : 'border-red-200 bg-red-50/50'
                            )}
                          >
                            {d.passed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-slate-700">{d.criterion}</p>
                              {!d.passed && d.reason && (
                                <p className="text-xs text-red-500 mt-1">{d.reason}</p>
                              )}
                            </div>
                            <label className="flex items-center gap-2 shrink-0">
                              <input
                                type="checkbox"
                                checked={criteriaChecks[`criterion_${idx}`] === true}
                                onChange={(e) =>
                                  setCriteriaChecks((prev) => ({
                                    ...prev,
                                    [`criterion_${idx}`]: e.target.checked,
                                  }))
                                }
                                className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                              />
                              <span className="text-xs text-slate-500">符合</span>
                            </label>
                          </div>
                        )
                      })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-600">
                    自动评估符合率：
                    <span
                      className={cn(
                        'text-lg font-bold ml-2',
                        eligibilityScore >= 80 ? 'text-green-600' : eligibilityScore >= 50 ? 'text-amber-600' : 'text-red-600'
                      )}
                    >
                      {eligibilityScore}%
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(0)}
                      className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      上一步
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-6 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
                    >
                      下一步
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-12">
                <p className="text-sm text-slate-400">未获取到筛选结果，请返回上一步选择试验</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div
              className={cn(
                'flex flex-col items-center p-8 rounded-xl',
                isEligible ? 'bg-green-50' : 'bg-red-50'
              )}
            >
              {isEligible ? (
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-3" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500 mb-3" />
              )}
              <h2 className={cn('text-xl font-bold', isEligible ? 'text-green-700' : 'text-red-700')}>
                {isEligible ? '符合入组条件' : '不符合入组条件'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                筛选符合率：{eligibilityScore}%
              </p>
            </div>

            <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-[var(--border)]">
                <h3 className="text-sm font-medium text-slate-700">受试者信息确认</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">姓名：</span>
                  <span className="text-slate-800 font-medium">{form.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">性别：</span>
                  <span className="text-slate-800 font-medium">{form.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400">年龄：</span>
                  <span className="text-slate-800 font-medium">{form.age}岁</span>
                </div>
                <div>
                  <span className="text-slate-400">联系电话：</span>
                  <span className="text-slate-800 font-medium">{form.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400">身份证号：</span>
                  <span className="text-slate-800 font-medium">{form.idNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400">试验项目：</span>
                  <span className="text-slate-800 font-medium">{selectedTrial?.name || form.trialId}</span>
                </div>
              </div>
            </div>

            {screeningResult && (
              <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-[var(--border)]">
                  <h3 className="text-sm font-medium text-slate-700">筛选结果明细</h3>
                </div>
                <div className="p-4 space-y-2">
                  {screeningResult.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {d.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="text-slate-700">{d.criterion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                上一步
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isEligible
                    ? 'bg-teal-700 text-white hover:bg-teal-800'
                    : 'bg-red-600 text-white hover:bg-red-700',
                  submitting && 'opacity-60 cursor-not-allowed'
                )}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                确认报名
              </button>
            </div>
          </div>
        )}
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center overflow-hidden">
            {confettiPieces.map((i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  backgroundColor: ['#0F766E', '#D97706', '#14B8A6', '#DC2626', '#6366F1', '#EC4899'][
                    i % 6
                  ],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              />
            ))}
            <div className="relative z-10">
              <PartyPopper className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">报名成功！</h2>
              <p className="text-sm text-slate-500 mb-6">
                受试者 {form.name} 已成功提交报名，状态为筛选中
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/subjects')}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  返回列表
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false)
                    setStep(0)
                    setForm(initialForm)
                    setScreeningResult(null)
                    setCriteriaChecks({})
                  }}
                  className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
                >
                  继续报名
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
