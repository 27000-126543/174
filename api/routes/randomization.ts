import { Router, type Request, type Response } from 'express'
import { randomizations, randomizationIds, subjects, trials, create, findById, update, pushMessage } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

interface RandomizationConfig {
  trialId: number
  groups: string[]
  ratio: number[]
  blockSize: number
  stratFactors: string[]
}

const configs: Map<number, RandomizationConfig> = new Map()

const router = Router()

router.post('/config', authMiddleware, requireRole('dm', 'sponsor'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, groups, ratio, blockSize, stratFactors } = req.body
    if (!trialId || !groups || !ratio || !blockSize) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    if (groups.length !== ratio.length) {
      res.status(400).json({ success: false, error: '组数与比例数不匹配' })
      return
    }
    const totalRatio = ratio.reduce((a: number, b: number) => a + b, 0)
    if (totalRatio !== blockSize) {
      res.status(400).json({ success: false, error: `组比例总和(${totalRatio})应等于区组大小(${blockSize})` })
      return
    }
    configs.set(trialId, { trialId, groups, ratio, blockSize, stratFactors: stratFactors || [] })
    res.json({ success: true, data: { trialId, groups, ratio, blockSize, stratFactors: stratFactors || [] } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/generate', authMiddleware, requireRole('dm'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, count } = req.body
    if (!trialId) {
      res.status(400).json({ success: false, error: '缺少试验ID' })
      return
    }
    const config = configs.get(trialId)
    if (!config) {
      res.status(400).json({ success: false, error: '请先配置随机化方案' })
      return
    }
    const generateCount = count || config.blockSize
    const block: string[] = []
    for (let i = 0; i < config.groups.length; i++) {
      for (let j = 0; j < config.ratio[i]; j++) {
        block.push(config.groups[i])
      }
    }
    const results: { randomNum: number; group: string; drugCode: string }[] = []
    for (let n = 0; n < generateCount; n++) {
      if (block.length === 0) {
        for (let i = 0; i < config.groups.length; i++) {
          for (let j = 0; j < config.ratio[i]; j++) {
            block.push(config.groups[i])
          }
        }
      }
      const idx = Math.floor(Math.random() * block.length)
      const group = block.splice(idx, 1)[0]
      const randomNum = randomizations.length + n + 1
      const drugPrefix = trials.find(t => t.id === trialId)?.protocol.split('-').slice(0, 2).join('-') || 'RND'
      const drugCode = `${drugPrefix}-${group === config.groups[0] ? 'A' : 'B'}-${String(randomNum).padStart(3, '0')}`
      results.push({ randomNum, group, drugCode })
    }
    res.json({ success: true, data: results })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/assign', authMiddleware, requireRole('dm'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { subjectId, trialId, group, drugCode, randomNum, stratFactor } = req.body
    if (!subjectId || !trialId || !group || !drugCode) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const subject = findById(subjects, subjectId)
    if (!subject) {
      res.status(404).json({ success: false, error: '受试者不存在' })
      return
    }
    const config = configs.get(trialId) || { blockSize: 4 }
    const existing = randomizations.find(r => r.subjectId === subjectId && r.trialId === trialId)
    if (existing) {
      res.status(400).json({ success: false, error: '该受试者已分配随机号' })
      return
    }
    const randomization = create(randomizations, {
      id: randomizationIds.next(),
      subjectId,
      trialId,
      drugCode,
      group,
      randomNum: randomNum || randomizations.length + 1,
      blockSize: config.blockSize,
      stratFactor: stratFactor || '',
      assignedAt: new Date().toISOString(),
    })
    update(subjects, subjectId, { status: 'randomized' })
    pushMessage(req.user!.id, 'randomization', '随机化分配', `受试者${subject.name}已分配至${group}，药物编号${drugCode}`, randomization.id, 'randomization')
    res.status(201).json({ success: true, data: randomization })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/list', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, subjectId } = req.query
    let result = [...randomizations]
    if (trialId) result = result.filter(r => r.trialId === Number(trialId))
    if (subjectId) result = result.filter(r => r.subjectId === Number(subjectId))
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
