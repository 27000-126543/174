import { Router, type Request, type Response } from 'express'
import { subjects, subjectIds, trials, consents, consentIds, create, update, pushMessage } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, centerId, status, keyword } = req.query
    let result = [...subjects]
    if (trialId) result = result.filter(s => s.trialId === Number(trialId))
    if (centerId) result = result.filter(s => s.centerId === Number(centerId))
    if (status) result = result.filter(s => s.status === status)
    if (keyword) {
      const kw = String(keyword).toLowerCase()
      result = result.filter(s => s.name.toLowerCase().includes(kw) || s.subjectCode.toLowerCase().includes(kw))
    }
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/enroll', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, centerId, name, gender, birthDate, age, phone, medicalConditions, medications } = req.body
    if (!trialId || !name || !gender) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const trial = trials.find(t => t.id === trialId)
    if (!trial) {
      res.status(404).json({ success: false, error: '试验不存在' })
      return
    }
    const trialSubjects = subjects.filter(s => s.trialId === trialId)
    const code = `${trial.protocol.split('-').slice(0, 2).join('-')}-${String(trialSubjects.length + 1).padStart(3, '0')}`
    const computedBirthDate = birthDate || (age ? `${new Date().getFullYear() - Number(age)}-01-01` : '2000-01-01')
    const subject = create(subjects, {
      id: subjectIds.next(),
      trialId,
      centerId: centerId || 1,
      subjectCode: code,
      name,
      gender,
      birthDate: computedBirthDate,
      phone: phone || '',
      status: 'enrolled',
      enrolledDate: new Date().toISOString().split('T')[0],
      medicalConditions: medicalConditions || [],
      medications: medications || [],
    })
    const consent = create(consents, {
      id: consentIds.next(),
      subjectId: subject.id,
      trialId,
      version: 'V1.0',
      content: `${trial?.name || ''}临床试验知情同意书\n\n版本：V1.0\n\n尊敬的受试者：\n\n您正在参加一项临床试验。在您决定是否参加之前，请仔细阅读以下内容：\n\n1. 试验目的：评估试验药物的安全性和有效性\n2. 试验流程：包括筛选期、治疗期和随访期\n3. 可能的风险：试验药物可能引起不良反应\n4. 您的权益：您可以随时退出试验\n5. 保密条款：您的个人信息将严格保密\n\n如您同意参加，请在下方签名。`,
      locked: false,
      createdAt: new Date().toISOString(),
    })
    pushMessage(req.user!.id, 'system', '受试者入组', `受试者${name}(${code})已成功入组`, subject.id, 'subject')
    res.status(201).json({ success: true, data: subject })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/screen', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialId, age, gender, sbp, dbp, hba1c, bmi, creatinine, conditions, allergies } = req.body
    if (!trialId) {
      res.status(400).json({ success: false, error: '缺少试验ID' })
      return
    }
    const trial = trials.find(t => t.id === trialId)
    if (!trial) {
      res.status(404).json({ success: false, error: '试验不存在' })
      return
    }
    const subjectData: Record<string, any> = { age, gender, sbp, dbp, hba1c, bmi, creatinine, conditions: conditions || [], allergies: allergies || [] }
    const inclusionResults = trial.inclusionCriteria.map(c => {
      const val = subjectData[c.field]
      let passed = false
      if (val === undefined) return { criterion: c, passed: false, reason: `缺少${c.field}数据` }
      switch (c.operator) {
        case '>=': passed = Number(val) >= Number(c.value); break
        case '<=': passed = Number(val) <= Number(c.value); break
        case '>': passed = Number(val) > Number(c.value); break
        case '<': passed = Number(val) < Number(c.value); break
        case 'in': passed = String(c.value).split(',').includes(String(val)); break
        case 'contains': passed = Array.isArray(val) && val.includes(String(c.value)); break
        default: passed = false
      }
      return { criterion: c, passed, reason: passed ? '' : `${c.description}: ${c.field}${c.operator}${c.value}, 实际值${val}` }
    })
    const exclusionResults = trial.exclusionCriteria.map(c => {
      const val = subjectData[c.field]
      let excluded = false
      if (val === undefined) return { criterion: c, excluded: false, reason: `缺少${c.field}数据` }
      switch (c.operator) {
        case 'contains': excluded = Array.isArray(val) && val.includes(String(c.value)); break
        case '>': excluded = Number(val) > Number(c.value); break
        case '>=': excluded = Number(val) >= Number(c.value); break
        default: excluded = false
      }
      return { criterion: c, excluded, reason: excluded ? `${c.description}: ${c.field}=${val}` : '' }
    })
    const inclusionPassed = inclusionResults.filter(r => r.passed).length
    const exclusionFailed = exclusionResults.filter(r => r.excluded).length
    const totalInclusion = inclusionResults.length
    const matchScore = Math.round((inclusionPassed / totalInclusion) * 100 * (exclusionFailed === 0 ? 1 : 0.5))
    const eligible = inclusionResults.every(r => r.passed) && exclusionResults.every(r => !r.excluded)
    res.json({
      success: true,
      data: {
        eligible,
        matchScore,
        inclusionResults,
        exclusionResults,
        summary: {
          inclusionPassed: `${inclusionPassed}/${totalInclusion}`,
          exclusionCount: exclusionFailed,
          recommendation: eligible ? '符合入组条件' : '不符合入组条件',
        },
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const subject = subjects.find(s => s.id === Number(req.params.id))
    if (!subject) {
      res.status(404).json({ success: false, error: '受试者不存在' })
      return
    }
    res.json({ success: true, data: subject })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, withdrawnReason } = req.body
    const validStatuses = ['enrolled', 'screening', 'eligible', 'consented', 'randomized', 'active', 'completed', 'withdrawn']
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' })
      return
    }
    const subject = update(subjects, Number(req.params.id), {
      status,
      ...(status === 'withdrawn' ? { withdrawnDate: new Date().toISOString().split('T')[0], withdrawnReason } : {}),
    })
    if (!subject) {
      res.status(404).json({ success: false, error: '受试者不存在' })
      return
    }
    pushMessage(req.user!.id, 'system', '状态变更', `受试者${subject.name}状态更新为${status}`, subject.id, 'subject')
    res.json({ success: true, data: subject })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
