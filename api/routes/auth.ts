import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { users, userIds, create } from '../db.js'
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, name, email, phone } = req.body
    if (!username || !password || !name) {
      res.status(400).json({ success: false, error: '用户名、密码和姓名为必填项' })
      return
    }
    const existing = users.find(u => u.username === username)
    if (existing) {
      res.status(400).json({ success: false, error: '用户名已存在' })
      return
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = create(users, {
      id: userIds.next(),
      username,
      password: hashedPassword,
      name,
      role: 'subject',
      email: email || '',
      phone: phone || '',
      createdAt: new Date().toISOString(),
    })
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email, phone: user.phone },
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码为必填项' })
      return
    }
    const user = users.find(u => u.username === username)
    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email, phone: user.phone, centerId: user.centerId },
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = users.find(u => u.id === req.user!.id)
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        centerId: user.centerId,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
