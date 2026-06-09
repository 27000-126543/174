import { Router, type Request, type Response } from 'express'
import { saeReports, saeIds, subjects, trials, create, update, findById, pushMessage, pushMessageToUsers, getUsersByRole } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, subjectId, status, eventType } = req.query
    let result = [...saeReports]
    if (trialId) result = result.filter(s => s.trialId === Number(trialId))
    if (subjectId) result = result.filter(s => s.subjectId === Number(subjectId))
    if (status) result = result.filter(s => s.status === status)
    if (eventType) result = result.filter(s => s.eventType === eventType)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/report', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { subjectId, trialId, eventType, description, onsetDate, causality, severity } = req.body
    if (!subjectId || !trialId || !eventType || !description || !onsetDate) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const reportDate = new Date().toISOString().split('T')[0]
    const onset = new Date(onsetDate)
    let deadline: string
    if (eventType === 'death' || eventType === 'life_threatening') {
      deadline = new Date(onset.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else {
      deadline = new Date(onset.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
    const sae = create(saeReports, {
      id: saeIds.next(),
      subjectId,
      trialId,
      eventType,
      description,
      onsetDate,
      reportDate,
      deadline,
      status: 'reported',
      reporterId: req.user!.id,
      causality: causality || '',
      severity: severity || '',
    })
    const subject = findById(subjects, subjectId)
    const ecUsers = getUsersByRole('ec').map(u => u.id)
    const sponsorUsers = getUsersByRole('sponsor').map(u => u.id)
    pushMessageToUsers(ecUsers, 'sae', '新的SAE报告', `受试者${subject?.name}报告${eventType === 'death' ? '死亡' : eventType === 'life_threatening' ? '危及生命' : '严重不良'}事件，截止日期${deadline}`, sae.id, 'sae')
    pushMessageToUsers(sponsorUsers, 'sae', '新的SAE报告', `受试者${subject?.name}报告严重不良事件`, sae.id, 'sae')
    res.status(201).json({ success: true, data: sae })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const subject = findById(subjects, sae.subjectId)
    res.json({ success: true, data: { ...sae, subjectName: subject?.name, subjectCode: subject?.subjectCode } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body
    const validStatuses = ['reported', 'under_review', 'submitted', 'closed']
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' })
      return
    }
    const sae = update(saeReports, Number(req.params.id), { status })
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const subject = findById(subjects, sae.subjectId)
    pushMessage(sae.reporterId, 'sae', 'SAE状态更新', `受试者${subject?.name}的SAE报告状态更新为${status}`, sae.id, 'sae')
    res.json({ success: true, data: sae })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
