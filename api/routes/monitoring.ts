import { Router, type Request, type Response } from 'express'
import { subjects, crfRecords, monitoringTasks, monitoringTaskIds, trials, saeReports, queries, create, update, findById } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/centers', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId } = req.query
    const targetTrialId = trialId ? Number(trialId) : undefined
    const trialList = targetTrialId ? trials.filter(t => t.id === targetTrialId) : trials
    const result = trialList.map(trial => ({
      trialId: trial.id,
      trialName: trial.name,
      centers: trial.centers.map(c => {
        const centerSubjects = subjects.filter(s => s.trialId === trial.id && s.centerId === c.id)
        return {
          centerId: c.id,
          centerName: c.name,
          enrolledCount: centerSubjects.length,
          activeCount: centerSubjects.filter(s => s.status === 'active').length,
          completedCount: centerSubjects.filter(s => s.status === 'completed').length,
          withdrawnCount: centerSubjects.filter(s => s.status === 'withdrawn').length,
          screeningCount: centerSubjects.filter(s => s.status === 'screening' || s.status === 'enrolled').length,
        }
      }),
    }))
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/anomalies', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const anomalies: any[] = []
    for (const crf of crfRecords) {
      if (crf.errors && crf.errors.length > 0) {
        anomalies.push({
          type: 'validation_error',
          crfId: crf.id,
          subjectId: crf.subjectId,
          trialId: crf.trialId,
          errors: crf.errors,
          severity: crf.errors.some(e => e.severity === 'error') ? 'high' : 'medium',
        })
      }
      if (crf.formType === 'vital_signs' && crf.data.sbp && crf.data.dbp) {
        const allVitals = crfRecords
          .filter(r => r.formType === 'vital_signs' && r.data.sbp)
          .map(r => r.data.sbp)
        if (allVitals.length >= 3) {
          const mean = allVitals.reduce((a: number, b: number) => a + b, 0) / allVitals.length
          const stdDev = Math.sqrt(allVitals.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / allVitals.length)
          if (Math.abs(crf.data.sbp - mean) > 2 * stdDev) {
            anomalies.push({
              type: 'outlier',
              crfId: crf.id,
              subjectId: crf.subjectId,
              field: 'sbp',
              value: crf.data.sbp,
              mean: Math.round(mean * 100) / 100,
              stdDev: Math.round(stdDev * 100) / 100,
              severity: 'medium',
            })
          }
        }
      }
      if (!crf.data.visitDate && crf.status !== 'draft') {
        anomalies.push({
          type: 'missing_data',
          crfId: crf.id,
          subjectId: crf.subjectId,
          field: 'visitDate',
          severity: 'high',
        })
      }
      const subject = findById(subjects, crf.subjectId)
      if (subject && crf.data.visitDate) {
        const visitDate = new Date(crf.data.visitDate)
        const enrolledDate = new Date(subject.enrolledDate)
        if (visitDate < enrolledDate) {
          anomalies.push({
            type: 'inconsistent_timestamp',
            crfId: crf.id,
            subjectId: crf.subjectId,
            message: '访视日期早于入组日期',
            visitDate: crf.data.visitDate,
            enrolledDate: subject.enrolledDate,
            severity: 'high',
          })
        }
      }
    }
    anomalies.sort((a, b) => (a.severity === 'high' ? -1 : 1))
    res.json({ success: true, data: anomalies })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, status, priority } = req.query
    let result = [...monitoringTasks]
    if (trialId) result = result.filter(t => t.trialId === Number(trialId))
    if (status) result = result.filter(t => t.status === status)
    if (priority) result = result.filter(t => t.priority === priority)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/tasks/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, description } = req.body
    const task = findById(monitoringTasks, Number(req.params.id))
    if (!task) {
      res.status(404).json({ success: false, error: '监查任务不存在' })
      return
    }
    const updates: any = {}
    if (status) updates.status = status
    if (description) updates.description = description
    if (status === 'completed') updates.completedAt = new Date().toISOString()
    const updated = update(monitoringTasks, Number(req.params.id), updates)
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
