import { Router, type Request, type Response } from 'express'
import { messages, findById, update } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, read, page, pageSize } = req.query
    let result = messages.filter(m => m.userId === req.user!.id)
    if (type) result = result.filter(m => m.type === type)
    if (read !== undefined) result = result.filter(m => m.read === (read === 'true'))
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const p = Number(page) || 1
    const ps = Number(pageSize) || 20
    const total = result.length
    const paginated = result.slice((p - 1) * ps, p * ps)
    const itemsWithCertificate = paginated.map(m => ({
      ...m,
      certificateUrl: m.relatedId ? `/api/messages/${m.id}/certificate` : null,
    }))
    res.json({
      success: true,
      data: {
        items: itemsWithCertificate,
        total,
        page: p,
        pageSize: ps,
        unreadCount: messages.filter(m => m.userId === req.user!.id && !m.read).length,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/read-all', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    let count = 0
    for (const msg of messages) {
      if (msg.userId === req.user!.id && !msg.read) {
        update(messages, msg.id, { read: true })
        count++
      }
    }
    res.json({ success: true, data: { count } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const msg = findById(messages, Number(req.params.id))
    if (!msg) {
      res.status(404).json({ success: false, error: '消息不存在' })
      return
    }
    if (msg.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: '无权操作此消息' })
      return
    }
    const updated = update(messages, Number(req.params.id), { read: true })
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id/certificate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const msg = findById(messages, Number(req.params.id))
    if (!msg) {
      res.status(404).json({ success: false, error: '消息不存在' })
      return
    }
    if (msg.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: '无权访问此消息' })
      return
    }
    res.json({
      success: true,
      data: {
        id: msg.id,
        type: msg.type,
        title: msg.title,
        downloadUrl: `/api/messages/${msg.id}/download`,
        relatedId: msg.relatedId,
        relatedType: msg.relatedType,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
