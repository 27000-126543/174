import { Router, type Request, type Response } from 'express'
import { visitRecords, visitIds, subjects, trials, create, update, findById, pushMessage } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/plan', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, subjectId } = req.query
    let result = [...visitRecords]
    if (trialId) result = result.filter(v => v.trialId === Number(trialId))
    if (subjectId) result = result.filter(v => v.subjectId === Number(subjectId))
    const plan = result.map(v => {
      const subject = findById(subjects, v.subjectId)
      return {
        ...v,
        subjectName: subject?.name,
        subjectCode: subject?.subjectCode,
      }
    })
    res.json({ success: true, data: plan })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/schedule', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, subjectId } = req.query
    let result = [...visitRecords]
    if (trialId) result = result.filter(v => v.trialId === Number(trialId))
    if (subjectId) result = result.filter(v => v.subjectId === Number(subjectId))
    const schedule = result.map(v => {
      const subject = findById(subjects, v.subjectId)
      let complianceStatus = 'on_time'
      if (v.actualDate && v.windowDays) {
        const planned = new Date(v.plannedDate)
        const actual = new Date(v.actualDate)
        const diffDays = Math.round((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays < -v.windowDays.before || diffDays > v.windowDays.after) {
          complianceStatus = 'out_of_window'
        }
      }
      return {
        ...v,
        subjectName: subject?.name,
        subjectCode: subject?.subjectCode,
        complianceStatus,
      }
    })
    res.json({ success: true, data: schedule })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/compliance', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { compliance, actualDate, status, notes } = req.body
    const validCompliance = ['compliant', 'non_compliant', 'partial', 'pending']
    if (compliance && !validCompliance.includes(compliance)) {
      res.status(400).json({ success: false, error: '无效的依从性状态' })
      return
    }
    const visit = findById(visitRecords, Number(req.params.id))
    if (!visit) {
      res.status(404).json({ success: false, error: '访视记录不存在' })
      return
    }
    const updates: any = {}
    if (compliance) updates.compliance = compliance
    if (actualDate) updates.actualDate = actualDate
    if (status) updates.status = status
    if (notes) updates.notes = notes
    const updated = update(visitRecords, Number(req.params.id), updates)
    const subject = findById(subjects, visit.subjectId)
    if (compliance === 'non_compliant') {
      pushMessage(req.user!.id, 'visit', '访视依从性异常', `受试者${subject?.name}的${visit.visitType}标记为不依从`, visit.id, 'visit')
    }
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/reminders', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId } = req.query
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    let visits = visitRecords.filter(v => v.status === 'planned')
    if (trialId) visits = visits.filter(v => v.trialId === Number(trialId))
    const reminders = visits
      .filter(v => {
        const planned = new Date(v.plannedDate)
        return planned >= today && planned <= nextWeek
      })
      .map(v => {
        const subject = findById(subjects, v.subjectId)
        return {
          visitId: v.id,
          subjectId: v.subjectId,
          subjectName: subject?.name,
          subjectCode: subject?.subjectCode,
          visitType: v.visitType,
          plannedDate: v.plannedDate,
          daysUntilVisit: Math.ceil((new Date(v.plannedDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        }
      })
    const overdueVisits = visitRecords
      .filter(v => v.status === 'planned' && new Date(v.plannedDate) < today)
      .map(v => {
        const subject = findById(subjects, v.subjectId)
        return {
          visitId: v.id,
          subjectId: v.subjectId,
          subjectName: subject?.name,
          subjectCode: subject?.subjectCode,
          visitType: v.visitType,
          plannedDate: v.plannedDate,
          daysOverdue: Math.ceil((today.getTime() - new Date(v.plannedDate).getTime()) / (1000 * 60 * 60 * 24)),
        }
      })
    res.json({ success: true, data: { upcoming: reminders, overdue: overdueVisits } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
