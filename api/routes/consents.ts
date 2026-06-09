import { Router, type Request, type Response } from 'express'
import { consents, consentIds, subjects, create, update, findById, pushMessage } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/:subjectId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const subjectId = Number(req.params.subjectId)
    const subjectConsents = consents.filter(c => c.subjectId === subjectId)
    if (subjectConsents.length === 0) {
      res.status(404).json({ success: false, error: '未找到知情同意书' })
      return
    }
    const subject = findById(subjects, subjectId)
    res.json({
      success: true,
      data: subjectConsents.map(c => ({
        ...c,
        subjectName: subject?.name,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/sign', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { consentId, signatureType, signatureData } = req.body
    if (!consentId || !signatureType || !signatureData) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    if (signatureType !== 'subject' && signatureType !== 'investigator') {
      res.status(400).json({ success: false, error: '签名类型必须为subject或investigator' })
      return
    }
    const consent = findById(consents, consentId)
    if (!consent) {
      res.status(404).json({ success: false, error: '知情同意书不存在' })
      return
    }
    if (consent.locked) {
      res.status(400).json({ success: false, error: '知情同意书已锁定，无法签署' })
      return
    }
    const now = new Date().toISOString()
    const updates: any = {}
    if (signatureType === 'subject') {
      updates.subjectSignature = signatureData
      updates.subjectSignedAt = now
    } else {
      updates.investigatorSignature = signatureData
      updates.investigatorSignedAt = now
    }
    const updated = update(consents, consentId, updates)
    const subject = findById(subjects, consent.subjectId)
    pushMessage(
      req.user!.id,
      'consent',
      '知情同意书签署',
      `${signatureType === 'subject' ? '受试者' : '研究者'}已签署知情同意书`,
      consentId,
      'consent'
    )
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/lock', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const consent = findById(consents, Number(req.params.id))
    if (!consent) {
      res.status(404).json({ success: false, error: '知情同意书不存在' })
      return
    }
    if (consent.locked) {
      res.status(400).json({ success: false, error: '知情同意书已锁定' })
      return
    }
    if (!consent.subjectSignature || !consent.investigatorSignature) {
      res.status(400).json({ success: false, error: '受试者和研究者均需签署后才能锁定' })
      return
    }
    const updated = update(consents, Number(req.params.id), {
      locked: true,
      lockedAt: new Date().toISOString(),
    })
    const subject = findById(subjects, consent.subjectId)
    pushMessage(
      req.user!.id,
      'consent',
      '知情同意书锁定',
      `受试者${subject?.name}的知情同意书已锁定`,
      consent.id,
      'consent'
    )
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
