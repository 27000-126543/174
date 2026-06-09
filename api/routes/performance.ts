import { Router, type Request, type Response } from 'express'
import { performanceReports, performanceIds, subjects, crfRecords, saeReports, queries, trials, create, findById, getUsersByRole, pushMessageToUsers } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/monthly', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, period } = req.query
    let result = [...performanceReports]
    if (trialId) result = result.filter(p => p.trialId === Number(trialId))
    if (period) result = result.filter(p => p.period === period)
    if (result.length === 0) {
      const targetTrialId = trialId ? Number(trialId) : undefined
      const trialList = targetTrialId ? trials.filter(t => t.id === targetTrialId) : trials
      const generated = trialList.map(trial => generateReport(trial.id))
      result = generated
    }
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

function generateReport(trialId: number) {
  const trial = findById(trials, trialId)
  const trialSubjects = subjects.filter(s => s.trialId === trialId)
  const trialCRFs = crfRecords.filter(c => c.trialId === trialId)
  const trialSAEs = saeReports.filter(s => s.trialId === trialId)
  const trialQueries = queries.filter(q => q.trialId === trialId)
  const totalEnrolled = trialSubjects.length
  const targetEnrollment = trial?.targetEnrollment || 100
  const enrollmentProgress = Math.round((totalEnrolled / targetEnrollment) * 100)
  const crfErrors = trialCRFs.filter(c => c.errors && c.errors.length > 0).length
  const qualityScore = trialCRFs.length > 0 ? Math.round(((trialCRFs.length - crfErrors) / trialCRFs.length) * 100) : 100
  const aeRate = totalEnrolled > 0 ? Math.round((trialSAEs.length / totalEnrolled) * 100) : 0
  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const report = create(performanceReports, {
    id: performanceIds.next(),
    trialId,
    period,
    enrollmentProgress,
    qualityScore,
    aeRate,
    details: {
      totalEnrolled,
      targetEnrollment,
      screeningFailure: trialSubjects.filter(s => s.status === 'screening').length,
      withdrawal: trialSubjects.filter(s => s.status === 'withdrawn').length,
      queriesOpen: trialQueries.filter(q => q.status === 'open').length,
      queriesClosed: trialQueries.filter(q => q.status === 'closed').length,
      saeCount: trialSAEs.length,
      complianceRate: Math.round(((trialCRFs.filter(c => c.status === 'verified').length) / Math.max(trialCRFs.length, 1)) * 100),
    },
    generatedAt: new Date().toISOString(),
  })
  const sponsorUsers = getUsersByRole('sponsor').map(u => u.id)
  pushMessageToUsers(sponsorUsers, 'performance', '月度绩效报告', `${period}月度绩效报告已生成`, report.id, 'performance')
  return report
}

export { generateReport }

export default router
