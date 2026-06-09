import { Router, type Request, type Response } from 'express'
import { saeReports, saeIds, subjects, trials, users, ethicsReviews, create, update, findById, pushMessage, pushMessageToUsers, getUsersByRole } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const eventTypeLabels: Record<string, string> = {
  death: '死亡', life_threatening: '危及生命',
  hospitalization: '住院', disabling: '致残',
  congenital_anomaly: '先天异常', other_serious: '其他严重',
}

const statusLabels: Record<string, string> = {
  reported: '已报告', under_review: '审查中', submitted: '已提交', closed: '已关闭',
}

const regulatoryStatusLabels: Record<string, string> = {
  pending: '待提交', submitted: '已提交监管', acknowledged: '监管已确认',
}

const nextActionLabels: Record<string, string> = {
  reported: '进入伦理审查',
  under_review: '提交监管机构',
  submitted: '等待监管确认',
  closed: '已完成',
}

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, subjectId, status, eventType } = req.query
    let result = [...saeReports]
    if (trialId) result = result.filter(s => s.trialId === Number(trialId))
    if (subjectId) result = result.filter(s => s.subjectId === Number(subjectId))
    if (status) result = result.filter(s => s.status === status)
    if (eventType) result = result.filter(s => s.eventType === eventType)
    const enriched = result.map(sae => {
      const subject = findById(subjects, sae.subjectId)
      const assignee = sae.assigneeId ? findById(users, sae.assigneeId) : null
      return {
        ...sae,
        subjectName: subject?.name,
        subjectCode: subject?.subjectCode,
        assigneeName: assignee?.name || '',
        nextAction: nextActionLabels[sae.status] || '',
        regulatoryStatusLabel: regulatoryStatusLabels[sae.regulatoryStatus || 'pending'] || '待提交',
      }
    })
    res.json({ success: true, data: enriched })
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
    const reportTime = new Date()
    let deadline: string
    if (eventType === 'death' || eventType === 'life_threatening') {
      deadline = new Date(reportTime.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else {
      deadline = new Date(reportTime.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
    const dmUsers = getUsersByRole('dm')
    const defaultAssignee = dmUsers[0]?.id
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
      assigneeId: defaultAssignee,
      regulatoryStatus: 'pending' as const,
      processingRecords: [{
        time: reportDate,
        action: '提交SAE报告',
        operator: findById(users, req.user!.id)?.name || '未知',
      }],
      escalationRecords: [],
      materials: [],
    })
    const subject = findById(subjects, subjectId)
    const ecUsers = getUsersByRole('ec').map(u => u.id)
    const sponsorUsers = getUsersByRole('sponsor').map(u => u.id)
    pushMessageToUsers(ecUsers, 'sae', '新的SAE报告', `受试者${subject?.name}报告${eventTypeLabels[eventType] || eventType}事件，截止日期${deadline}`, sae.id, 'sae')
    pushMessageToUsers(sponsorUsers, 'sae', '新的SAE报告', `受试者${subject?.name}报告${eventTypeLabels[eventType] || eventType}事件`, sae.id, 'sae')
    const dmUserIds = dmUsers.map(u => u.id)
    pushMessageToUsers(dmUserIds, 'sae', '监管机构报告提醒', `受试者${subject?.name}报告${eventTypeLabels[eventType] || eventType}事件，截止日期${deadline}，请及时处理`, sae.id, 'sae')
    res.status(201).json({ success: true, data: sae })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/disposal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { opinion } = req.body
    if (!opinion) {
      res.status(400).json({ success: false, error: '处置意见不能为空' })
      return
    }
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const operator = findById(users, req.user!.id)?.name || '未知'
    const now = new Date().toISOString().split('T')[0]
    const records = [...(sae.processingRecords || []), { time: now, action: '补充处置意见', operator, detail: opinion }]
    const updated = update(saeReports, sae.id, { processingRecords: records })
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/material', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body
    if (!name) {
      res.status(400).json({ success: false, error: '材料名称不能为空' })
      return
    }
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const operator = findById(users, req.user!.id)?.name || '未知'
    const now = new Date().toISOString().split('T')[0]
    const newMaterial = { id: (sae.materials || []).length + 1, name, description: description || '', uploadedAt: now, uploadedBy: req.user!.id }
    const materials = [...(sae.materials || []), newMaterial]
    const records = [...(sae.processingRecords || []), { time: now, action: `上传说明材料：${name}`, operator }]
    const updated = update(saeReports, sae.id, { materials, processingRecords: records })
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/regulatory-status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { regulatoryStatus } = req.body
    const validStatuses = ['pending', 'submitted', 'acknowledged']
    if (!regulatoryStatus || !validStatuses.includes(regulatoryStatus)) {
      res.status(400).json({ success: false, error: '无效的监管状态' })
      return
    }
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const operator = findById(users, req.user!.id)?.name || '未知'
    const now = new Date().toISOString().split('T')[0]
    const records = [...(sae.processingRecords || []), { time: now, action: `更新监管状态为：${regulatoryStatusLabels[regulatoryStatus]}`, operator }]
    const updated = update(saeReports, sae.id, { regulatoryStatus: regulatoryStatus as any, processingRecords: records })
    const subject = findById(subjects, sae.subjectId)
    if (regulatoryStatus === 'submitted') {
      const ecUsers = getUsersByRole('ec').map(u => u.id)
      pushMessageToUsers(ecUsers, 'sae', 'SAE已提交监管', `受试者${subject?.name}的SAE报告已提交监管机构`, sae.id, 'sae')
    }
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/remind', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const operator = findById(users, req.user!.id)?.name || '未知'
    const now = new Date().toISOString().split('T')[0]
    const records = [...(sae.processingRecords || []), { time: now, action: '发送催办通知', operator, detail: `催办通知已发送至责任人` }]
    const updated = update(saeReports, sae.id, { processingRecords: records })
    if (sae.assigneeId) {
      pushMessage(sae.assigneeId, 'sae', 'SAE催办提醒', `SAE-${sae.id}即将到期，请尽快处理`, sae.id, 'sae')
    }
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/escalate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body
    if (!reason) {
      res.status(400).json({ success: false, error: '升级原因不能为空' })
      return
    }
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const operator = findById(users, req.user!.id)?.name || '未知'
    const now = new Date().toISOString().split('T')[0]
    const escalation = { time: now, reason, fromLevel: '数据管理员', toLevel: '申办方/伦理委员会', operator }
    const escalationRecords = [...(sae.escalationRecords || []), escalation]
    const records = [...(sae.processingRecords || []), { time: now, action: '升级处理', operator, detail: reason }]
    const updated = update(saeReports, sae.id, { escalationRecords, processingRecords: records })
    const sponsorUsers = getUsersByRole('sponsor').map(u => u.id)
    const ecUsers = getUsersByRole('ec').map(u => u.id)
    pushMessageToUsers([...sponsorUsers, ...ecUsers], 'sae', 'SAE升级通知', `SAE-${sae.id}已升级处理：${reason}`, sae.id, 'sae')
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/certificate/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const subject = findById(subjects, sae.subjectId)
    const trial = findById(trials, sae.trialId)
    const reporter = findById(users, sae.reporterId)
    const assignee = sae.assigneeId ? findById(users, sae.assigneeId) : null
    const isUrgent = sae.eventType === 'death' || sae.eventType === 'life_threatening'
    const processingRecords = sae.processingRecords || []
    const notificationTargets = [
      { target: '伦理委员会', detail: '全部EC成员' },
      { target: '申办方', detail: trial ? findById(users, trial.sponsorId)?.name || '' : '' },
      { target: '监管机构', detail: '数据管理员代收' },
    ]
    res.json({
      success: true,
      data: {
        certificateId: `SAE-CERT-${String(sae.id).padStart(4, '0')}`,
        saeId: sae.id,
        subjectCode: subject?.subjectCode || '',
        subjectName: subject?.name || '',
        eventType: eventTypeLabels[sae.eventType] || sae.eventType,
        eventTypeRaw: sae.eventType,
        description: sae.description,
        onsetDate: sae.onsetDate,
        reportDate: sae.reportDate,
        deadline: sae.deadline,
        deadlineType: isUrgent ? '24小时' : '15天',
        severity: sae.severity,
        causality: sae.causality,
        reporterName: reporter?.name || '未知',
        assigneeName: assignee?.name || '未指定',
        status: statusLabels[sae.status] || sae.status,
        statusRaw: sae.status,
        regulatoryStatus: regulatoryStatusLabels[sae.regulatoryStatus || 'pending'] || '待提交',
        nextAction: nextActionLabels[sae.status] || '',
        trialName: trial?.name || '',
        trialProtocol: trial?.protocol || '',
        processingRecords,
        escalationRecords: sae.escalationRecords || [],
        materials: sae.materials || [],
        notificationTargets,
        generatedAt: new Date().toISOString(),
      },
    })
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
    const assignee = sae.assigneeId ? findById(users, sae.assigneeId) : null
    res.json({
      success: true,
      data: {
        ...sae,
        subjectName: subject?.name,
        subjectCode: subject?.subjectCode,
        assigneeName: assignee?.name || '',
        nextAction: nextActionLabels[sae.status] || '',
        regulatoryStatusLabel: regulatoryStatusLabels[sae.regulatoryStatus || 'pending'] || '待提交',
      },
    })
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
    const sae = findById(saeReports, Number(req.params.id))
    if (!sae) {
      res.status(404).json({ success: false, error: 'SAE报告不存在' })
      return
    }
    const operator = findById(users, req.user!.id)?.name || '未知'
    const now = new Date().toISOString().split('T')[0]
    const records = [...(sae.processingRecords || []), { time: now, action: `状态更新为：${statusLabels[status]}`, operator }]
    const updated = update(saeReports, sae.id, { status, processingRecords: records })
    const subject = findById(subjects, sae.subjectId)
    pushMessage(sae.reporterId, 'sae', 'SAE状态更新', `受试者${subject?.name}的SAE报告状态更新为${statusLabels[status]}`, sae.id, 'sae')
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
