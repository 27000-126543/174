import { Router, type Request, type Response } from 'express'
import { crfRecords, crfIds, queries, queryIds, subjects, create, update, findById, pushMessage } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, subjectId, formType, status } = req.query
    let result = [...crfRecords]
    if (trialId) result = result.filter(c => c.trialId === Number(trialId))
    if (subjectId) result = result.filter(c => c.subjectId === Number(subjectId))
    if (formType) result = result.filter(c => c.formType === formType)
    if (status) result = result.filter(c => c.status === status)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/queries', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, subjectId, status } = req.query
    let result = [...queries]
    if (trialId) result = result.filter(q => q.trialId === Number(trialId))
    if (subjectId) result = result.filter(q => q.subjectId === Number(subjectId))
    if (status) result = result.filter(q => q.status === status)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/queries/batch', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { queryIds: qIds, action, answer } = req.body
    if (!qIds || !Array.isArray(qIds) || !action) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const results: any[] = []
    for (const qId of qIds) {
      const q = findById(queries, qId)
      if (!q) continue
      if (action === 'answer' && answer) {
        const updated = update(queries, qId, {
          answer,
          status: 'answered',
          answeredBy: req.user!.id,
          answeredAt: new Date().toISOString(),
        })
        results.push(updated)
      } else if (action === 'close') {
        const updated = update(queries, qId, {
          status: 'closed',
          answeredAt: q.answeredAt || new Date().toISOString(),
        })
        results.push(updated)
      }
    }
    res.json({ success: true, data: results })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/queries/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = findById(queries, Number(req.params.id))
    if (!q) {
      res.status(404).json({ success: false, error: '质疑不存在' })
      return
    }
    const { answer, action } = req.body
    const updates: any = {}
    if (answer) {
      updates.answer = answer
      updates.status = 'answered'
      updates.answeredBy = req.user!.id
      updates.answeredAt = new Date().toISOString()
    }
    if (action === 'close') {
      updates.status = 'closed'
      if (!updates.answeredAt) updates.answeredAt = new Date().toISOString()
    }
    const updated = update(queries, Number(req.params.id), updates)
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const crf = findById(crfRecords, Number(req.params.id))
    if (!crf) {
      res.status(404).json({ success: false, error: 'CRF记录不存在' })
      return
    }
    const relatedQueries = queries.filter(q => q.crfId === crf.id)
    res.json({ success: true, data: { ...crf, queries: relatedQueries } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const crf = findById(crfRecords, Number(req.params.id))
    if (!crf) {
      res.status(404).json({ success: false, error: 'CRF记录不存在' })
      return
    }
    const { data, status } = req.body
    const updated = update(crfRecords, Number(req.params.id), {
      ...(data ? { data } : {}),
      ...(status ? { status } : {}),
      updatedAt: new Date().toISOString(),
    })
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/validate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { crfId } = req.body
    if (!crfId) {
      res.status(400).json({ success: false, error: '缺少CRF ID' })
      return
    }
    const crf = findById(crfRecords, crfId)
    if (!crf) {
      res.status(404).json({ success: false, error: 'CRF记录不存在' })
      return
    }
    const errors: { field: string; message: string; severity: 'error' | 'warning' }[] = []
    const data = crf.data

    if (!data.visitDate) {
      errors.push({ field: 'visitDate', message: '访视日期为必填项', severity: 'error' })
    }

    if (data.sbp !== undefined) {
      if (data.sbp < 60 || data.sbp > 250) {
        errors.push({ field: 'sbp', message: `收缩压${data.sbp}超出合理范围(60-250mmHg)`, severity: 'error' })
      } else if (data.sbp < 90 || data.sbp > 180) {
        errors.push({ field: 'sbp', message: `收缩压${data.sbp}处于异常范围(90-180mmHg)`, severity: 'warning' })
      }
    }
    if (data.dbp !== undefined) {
      if (data.dbp < 30 || data.dbp > 150) {
        errors.push({ field: 'dbp', message: `舒张压${data.dbp}超出合理范围(30-150mmHg)`, severity: 'error' })
      } else if (data.dbp < 60 || data.dbp > 110) {
        errors.push({ field: 'dbp', message: `舒张压${data.dbp}处于异常范围(60-110mmHg)`, severity: 'warning' })
      }
    }
    if (data.heartRate !== undefined) {
      if (data.heartRate < 30 || data.heartRate > 220) {
        errors.push({ field: 'heartRate', message: `心率${data.heartRate}超出合理范围(30-220bpm)`, severity: 'error' })
      } else if (data.heartRate < 50 || data.heartRate > 120) {
        errors.push({ field: 'heartRate', message: `心率${data.heartRate}处于异常范围(50-120bpm)`, severity: 'warning' })
      }
    }
    if (data.temperature !== undefined) {
      if (data.temperature < 34 || data.temperature > 42) {
        errors.push({ field: 'temperature', message: `体温${data.temperature}超出合理范围(34-42℃)`, severity: 'error' })
      }
    }
    if (data.alt !== undefined && data.alt > 40) {
      errors.push({ field: 'alt', message: `ALT ${data.alt}偏高(正常0-40U/L)`, severity: 'warning' })
    }
    if (data.ast !== undefined && data.ast > 40) {
      errors.push({ field: 'ast', message: `AST ${data.ast}偏高(正常0-40U/L)`, severity: 'warning' })
    }
    if (data.creatinine !== undefined && data.creatinine > 1.5) {
      errors.push({ field: 'creatinine', message: `血肌酐${data.creatinine}偏高(正常0.6-1.2mg/dL)`, severity: 'warning' })
    }
    if (data.hba1c !== undefined && (data.hba1c < 4 || data.hba1c > 14)) {
      errors.push({ field: 'hba1c', message: `糖化血红蛋白${data.hba1c}%超出合理范围(4-14%)`, severity: 'error' })
    }

    if (data.sbp !== undefined && data.dbp !== undefined && data.sbp <= data.dbp) {
      errors.push({ field: 'sbp', message: '收缩压应大于舒张压', severity: 'error' })
    }
    if (data.height !== undefined && data.weight !== undefined) {
      const bmi = data.weight / ((data.height / 100) ** 2)
      if (bmi < 10 || bmi > 60) {
        errors.push({ field: 'weight', message: `BMI ${bmi.toFixed(1)}超出合理范围，请核实身高体重`, severity: 'error' })
      }
    }

    update(crfRecords, crfId, { errors, updatedAt: new Date().toISOString() })

    const newQueries: any[] = []
    for (const err of errors.filter(e => e.severity === 'error')) {
      const subject = findById(subjects, crf.subjectId)
      const q = create(queries, {
        id: queryIds.next(),
        crfId,
        subjectId: crf.subjectId,
        trialId: crf.trialId,
        question: err.message,
        status: 'open',
        createdBy: req.user!.id,
        createdAt: new Date().toISOString(),
      })
      newQueries.push(q)
      const crcUsers = [5, 6]
      for (const uid of crcUsers) {
        pushMessage(uid, 'query', 'CRF验证发现错误', err.message, q.id, 'query')
      }
    }

    res.json({
      success: true,
      data: {
        crfId,
        errors,
        errorCount: errors.length,
        criticalErrors: errors.filter(e => e.severity === 'error').length,
        warnings: errors.filter(e => e.severity === 'warning').length,
        generatedQueries: newQueries.length,
        queries: newQueries,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
