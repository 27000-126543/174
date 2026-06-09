import { Router, type Request, type Response } from 'express'
import { dataLocks, dataLockIds, crfRecords, subjects, trials, saeReports, queries, users, create, update, findById, pushMessageToUsers, getUsersByRole } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.post('/lock', authMiddleware, requireRole('dm'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, reason } = req.body
    if (!trialId || !reason) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const existingLock = dataLocks.find(dl => dl.trialId === trialId && dl.status === 'locked')
    if (existingLock) {
      res.status(400).json({ success: false, error: '数据已锁定' })
      return
    }
    const lock = create(dataLocks, {
      id: dataLockIds.next(),
      trialId,
      lockedBy: req.user!.id,
      lockedAt: new Date().toISOString(),
      status: 'locked',
      reason,
    })
    const dmUsers = getUsersByRole('dm').map(u => u.id)
    pushMessageToUsers(dmUsers, 'data_lock', '数据锁定', `试验ID ${trialId}的数据已锁定，原因：${reason}`, lock.id, 'data_lock')
    res.status(201).json({ success: true, data: lock })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/unlock', authMiddleware, requireRole('dm'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, reason } = req.body
    if (!trialId) {
      res.status(400).json({ success: false, error: '缺少试验ID' })
      return
    }
    const lock = dataLocks.find(dl => dl.trialId === trialId && dl.status === 'locked')
    if (!lock) {
      res.status(404).json({ success: false, error: '未找到锁定记录' })
      return
    }
    const updated = update(dataLocks, lock.id, {
      status: 'unlock_requested',
      reason: reason || lock.reason,
    })
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/log', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId } = req.query
    let result = [...dataLocks]
    if (trialId) result = result.filter(dl => dl.trialId === Number(trialId))
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/report', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, centerId } = req.query
    const targetTrialId = trialId ? Number(trialId) : undefined
    const targetCenterId = centerId ? Number(centerId) : undefined
    const trialList = targetTrialId ? trials.filter(t => t.id === targetTrialId) : trials
    const reports = trialList.map(trial => {
      let trialSubjects = subjects.filter(s => s.trialId === trial.id)
      if (targetCenterId) trialSubjects = trialSubjects.filter(s => s.centerId === targetCenterId)
      const subjectIds = new Set(trialSubjects.map(s => s.id))
      let trialCRFs = crfRecords.filter(c => c.trialId === trial.id)
      if (targetCenterId) trialCRFs = trialCRFs.filter(c => subjectIds.has(c.subjectId))
      let trialSAEs = saeReports.filter(s => s.trialId === trial.id)
      if (targetCenterId) trialSAEs = trialSAEs.filter(s => subjectIds.has(s.subjectId))
      let trialQueries = queries.filter(q => q.trialId === trial.id)
      if (targetCenterId) trialQueries = trialQueries.filter(q => subjectIds.has(q.subjectId))
      const vitalCRFs = trialCRFs.filter(c => c.formType === 'vital_signs')
      const sbpValues = vitalCRFs.filter(c => c.data.sbp).map(c => c.data.sbp)
      const dbpValues = vitalCRFs.filter(c => c.data.dbp).map(c => c.data.dbp)
      const hrValues = vitalCRFs.filter(c => c.data.heartRate).map(c => c.data.heartRate)
      const calcStats = (values: number[]) => {
        if (values.length === 0) return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0, median: 0 }
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
        const sorted = [...values].sort((a, b) => a - b)
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        return { count: values.length, mean: Math.round(mean * 100) / 100, stdDev: Math.round(stdDev * 100) / 100, min: Math.min(...values), max: Math.max(...values), median: Math.round(median * 100) / 100 }
      }
      return {
        trialId: trial.id,
        trialName: trial.name,
        phase: trial.phase,
        status: trial.status,
        sponsorName: findById(users, trial.sponsorId)?.name || '未知',
        centers: trial.centers
          .filter(c => !targetCenterId || c.id === targetCenterId)
          .map(c => ({
            id: c.id,
            name: c.name,
            enrolledCount: c.enrolledCount,
            subjects: trialSubjects.filter(s => s.centerId === c.id).length,
          })),
        centerId: targetCenterId || null,
        centerName: targetCenterId ? trial.centers.find(c => c.id === targetCenterId)?.name || '' : null,
        enrollment: {
          total: trialSubjects.length,
          target: trial.targetEnrollment,
          progress: Math.round((trialSubjects.length / trial.targetEnrollment) * 100),
          byStatus: {
            active: trialSubjects.filter(s => s.status === 'active').length,
            completed: trialSubjects.filter(s => s.status === 'completed').length,
            withdrawn: trialSubjects.filter(s => s.status === 'withdrawn').length,
            screening: trialSubjects.filter(s => ['screening', 'enrolled'].includes(s.status)).length,
            eligible: trialSubjects.filter(s => s.status === 'eligible').length,
            consented: trialSubjects.filter(s => s.status === 'consented').length,
            randomized: trialSubjects.filter(s => s.status === 'randomized').length,
            other: trialSubjects.filter(s => !['active', 'completed', 'withdrawn', 'screening', 'enrolled', 'eligible', 'consented', 'randomized'].includes(s.status)).length,
          },
        },
        crfStats: {
          total: trialCRFs.length,
          verified: trialCRFs.filter(c => c.status === 'verified').length,
          submitted: trialCRFs.filter(c => c.status === 'submitted').length,
          draft: trialCRFs.filter(c => c.status === 'draft').length,
          withErrors: trialCRFs.filter(c => c.errors && c.errors.length > 0).length,
        },
        vitalSigns: {
          sbp: calcStats(sbpValues),
          dbp: calcStats(dbpValues),
          heartRate: calcStats(hrValues),
        },
        saeStats: {
          total: trialSAEs.length,
          byType: {
            death: trialSAEs.filter(s => s.eventType === 'death').length,
            life_threatening: trialSAEs.filter(s => s.eventType === 'life_threatening').length,
            hospitalization: trialSAEs.filter(s => s.eventType === 'hospitalization').length,
            disabling: trialSAEs.filter(s => s.eventType === 'disabling').length,
            congenital_anomaly: trialSAEs.filter(s => s.eventType === 'congenital_anomaly').length,
            other_serious: trialSAEs.filter(s => s.eventType === 'other_serious').length,
          },
        },
        queryStats: {
          total: trialQueries.length,
          open: trialQueries.filter(q => q.status === 'open').length,
          answered: trialQueries.filter(q => q.status === 'answered').length,
          closed: trialQueries.filter(q => q.status === 'closed').length,
        },
        lockDate: dataLocks.find(dl => dl.trialId === trial.id)?.lockedAt || '',
      }
    })
    res.json({ success: true, data: reports })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/summary', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, centerId } = req.query
    const targetTrialId = trialId ? Number(trialId) : undefined
    const targetCenterId = centerId ? Number(centerId) : undefined
    const trialList = targetTrialId ? trials.filter(t => t.id === targetTrialId) : trials
    const summaries = trialList.map(trial => {
      let trialSubjects = subjects.filter(s => s.trialId === trial.id)
      if (targetCenterId) trialSubjects = trialSubjects.filter(s => s.centerId === targetCenterId)
      const subjectIds = new Set(trialSubjects.map(s => s.id))
      let trialSAEs = saeReports.filter(s => s.trialId === trial.id)
      if (targetCenterId) trialSAEs = trialSAEs.filter(s => subjectIds.has(s.subjectId))
      let trialQueries = queries.filter(q => q.trialId === trial.id)
      if (targetCenterId) trialQueries = trialQueries.filter(q => subjectIds.has(q.subjectId))
      let trialCRFs = crfRecords.filter(c => c.trialId === trial.id)
      if (targetCenterId) trialCRFs = trialCRFs.filter(c => subjectIds.has(c.subjectId))
      const openQueries = trialQueries.filter(q => q.status === 'open').length
      const totalQueries = trialQueries.length
      const verifiedCRFs = trialCRFs.filter(c => c.status === 'verified').length
      const totalCRFs = trialCRFs.length
      const errorCRFs = trialCRFs.filter(c => c.errors && c.errors.length > 0).length
      const dataQualityScore = totalCRFs > 0
        ? Math.round(((verifiedCRFs + (totalCRFs - errorCRFs - verifiedCRFs) * 0.5) / totalCRFs) * 100)
        : 100
      return {
        trialId: trial.id,
        trialName: trial.name,
        protocol: trial.protocol,
        phase: trial.phase,
        status: trial.status,
        sponsor: users.find(u => u.id === trial.sponsorId)?.name || '未知',
        centerId: targetCenterId || null,
        centerName: targetCenterId ? trial.centers.find(c => c.id === targetCenterId)?.name || '' : null,
        centers: trial.centers
          .filter(c => !targetCenterId || c.id === targetCenterId)
          .map(c => ({
            id: c.id,
            name: c.name,
            enrolledCount: c.enrolledCount,
            subjects: trialSubjects.filter(s => s.centerId === c.id).length,
          })),
        enrollment: `${trialSubjects.length}/${trial.targetEnrollment}`,
        enrollmentRate: Math.round((trialSubjects.length / trial.targetEnrollment) * 100) + '%',
        activeSubjects: trialSubjects.filter(s => s.status === 'active').length,
        completedSubjects: trialSubjects.filter(s => s.status === 'completed').length,
        withdrawnSubjects: trialSubjects.filter(s => s.status === 'withdrawn').length,
        saeCount: trialSAEs.length,
        openQueries: openQueries,
        queryResolutionRate: totalQueries > 0 ? Math.round(((totalQueries - openQueries) / totalQueries) * 100) + '%' : 'N/A',
        dataQualityScore,
        startDate: trial.startDate || 'N/A',
        endDate: trial.endDate || 'N/A',
      }
    })
    res.json({ success: true, data: summaries })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
