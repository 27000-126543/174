import { Router, type Request, type Response } from 'express'
import { ethicsReviews, ethicsIds, trials, users, create, update, findById, pushMessage, pushMessageToUsers, getUsersByRole } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/submissions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, status, submissionType } = req.query
    let result = [...ethicsReviews]
    if (trialId) result = result.filter(e => e.trialId === Number(trialId))
    if (status) result = result.filter(e => e.status === status)
    if (submissionType) result = result.filter(e => e.submissionType === submissionType)
    result = result.map(e => {
      const trial = findById(trials, e.trialId)
      const submitter = findById(users, e.submittedBy)
      return { ...e, trialName: trial?.name, submitterName: submitter?.name }
    })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/submit', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, submissionType } = req.body
    if (!trialId || !submissionType) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const trial = findById(trials, trialId)
    if (!trial) {
      res.status(404).json({ success: false, error: '试验不存在' })
      return
    }
    const review = create(ethicsReviews, {
      id: ethicsIds.next(),
      trialId,
      submissionType,
      submittedBy: req.user!.id,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    })
    const ecUsers = getUsersByRole('ec').map(u => u.id)
    pushMessageToUsers(ecUsers, 'ethics', '新的伦理审查申请', `试验${trial.name}提交了${submissionType === 'initial' ? '初始' : submissionType === 'amendment' ? '修正' : submissionType === 'annual' ? '年度' : 'SAE'}审查申请`, review.id, 'ethics')
    res.status(201).json({ success: true, data: review })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/review', authMiddleware, requireRole('ec'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, reviewComment } = req.body
    if (!status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, error: '审查结果必须为approved或rejected' })
      return
    }
    const review = findById(ethicsReviews, Number(req.params.id))
    if (!review) {
      res.status(404).json({ success: false, error: '审查记录不存在' })
      return
    }
    if (review.status !== 'pending') {
      res.status(400).json({ success: false, error: '该审查已处理' })
      return
    }
    const updated = update(ethicsReviews, Number(req.params.id), {
      status,
      reviewComment: reviewComment || '',
      reviewerId: req.user!.id,
      reviewedAt: new Date().toISOString(),
    })
    if (status === 'approved' && review.submissionType === 'initial') {
      update(trials, review.trialId, { status: 'ongoing' })
    }
    const trial = findById(trials, review.trialId)
    pushMessage(
      review.submittedBy,
      'ethics',
      '伦理审查结果',
      `试验${trial?.name}的${review.submissionType === 'initial' ? '初始' : review.submissionType === 'amendment' ? '修正' : '年度'}审查已${status === 'approved' ? '批准' : '驳回'}${reviewComment ? '：' + reviewComment : ''}`,
      review.id,
      'ethics'
    )
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const review = findById(ethicsReviews, Number(req.params.id))
    if (!review) {
      res.status(404).json({ success: false, error: '审查记录不存在' })
      return
    }
    const trial = findById(trials, review.trialId)
    const submitter = findById(users, review.submittedBy)
    const reviewer = review.reviewerId ? findById(users, review.reviewerId) : null
    res.json({
      success: true,
      data: {
        ...review,
        trialName: trial?.name,
        submitterName: submitter?.name,
        reviewerName: reviewer?.name,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
