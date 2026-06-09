import bcrypt from 'bcryptjs'

const hash = bcrypt.hashSync('123456', 10)

export interface User {
  id: number
  username: string
  password: string
  name: string
  role: 'sponsor' | 'investigator' | 'crc' | 'dm' | 'ec' | 'subject'
  email: string
  phone: string
  centerId?: number
  createdAt: string
}

export interface Trial {
  id: number
  name: string
  protocol: string
  phase: string
  status: 'planning' | 'ongoing' | 'completed' | 'suspended'
  sponsorId: number
  startDate: string
  endDate: string
  inclusionCriteria: InclusionCriterion[]
  exclusionCriteria: ExclusionCriterion[]
  centers: Center[]
  targetEnrollment: number
}

export interface InclusionCriterion {
  id: number
  field: string
  operator: string
  value: string | number
  description: string
}

export interface ExclusionCriterion {
  id: number
  field: string
  operator: string
  value: string | number
  description: string
}

export interface Center {
  id: number
  name: string
  investigatorId: number
  crcId: number
  enrolledCount: number
}

export interface Subject {
  id: number
  trialId: number
  centerId: number
  subjectCode: string
  name: string
  gender: 'male' | 'female'
  birthDate: string
  phone?: string
  status: 'enrolled' | 'screening' | 'eligible' | 'consented' | 'randomized' | 'active' | 'completed' | 'withdrawn'
  enrolledDate: string
  withdrawnDate?: string
  withdrawnReason?: string
  medicalConditions: string[]
  medications: string[]
}

export interface Consent {
  id: number
  subjectId: number
  trialId: number
  version: string
  content: string
  subjectSignature?: string
  subjectSignedAt?: string
  investigatorSignature?: string
  investigatorSignedAt?: string
  locked: boolean
  lockedAt?: string
  createdAt: string
}

export interface CRFRecord {
  id: number
  subjectId: number
  trialId: number
  visitId: number
  formType: string
  data: Record<string, any>
  status: 'draft' | 'submitted' | 'verified'
  errors: CRFError[]
  createdAt: string
  updatedAt: string
}

export interface CRFError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface Query {
  id: number
  crfId: number
  subjectId: number
  trialId: number
  question: string
  answer?: string
  status: 'open' | 'answered' | 'closed'
  createdBy: number
  answeredBy?: number
  createdAt: string
  answeredAt?: string
}

export interface SAEReport {
  id: number
  subjectId: number
  trialId: number
  eventType: 'death' | 'life_threatening' | 'hospitalization' | 'disabling' | 'congenital_anomaly' | 'other_serious'
  description: string
  onsetDate: string
  reportDate: string
  deadline: string
  status: 'reported' | 'under_review' | 'submitted' | 'closed'
  reporterId: number
  causality?: string
  severity?: string
  processingRecords?: SAEProcessingRecord[]
  escalationRecords?: SAEEscalationRecord[]
  materials?: SAEMaterial[]
  assigneeId?: number
  regulatoryStatus?: 'pending' | 'submitted' | 'acknowledged'
}

export interface SAEProcessingRecord {
  time: string
  action: string
  operator: string
  detail?: string
}

export interface SAEEscalationRecord {
  time: string
  reason: string
  fromLevel: string
  toLevel: string
  operator: string
}

export interface SAEMaterial {
  id: number
  name: string
  description: string
  uploadedAt: string
  uploadedBy: number
}

export interface Randomization {
  id: number
  subjectId: number
  trialId: number
  drugCode: string
  group: string
  randomNum: number
  blockSize: number
  stratFactor?: string
  assignedAt: string
}

export interface EthicsReview {
  id: number
  trialId: number
  submissionType: 'initial' | 'amendment' | 'annual' | 'sae'
  submittedBy: number
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewerId?: number
  reviewComment?: string
  reviewedAt?: string
}

export interface VisitRecord {
  id: number
  subjectId: number
  trialId: number
  visitType: string
  plannedDate: string
  actualDate?: string
  status: 'planned' | 'completed' | 'missed' | 'rescheduled'
  compliance: 'compliant' | 'non_compliant' | 'partial' | 'pending'
  notes?: string
  windowDays?: { before: number; after: number }
}

export interface DataLock {
  id: number
  trialId: number
  lockedBy: number
  lockedAt: string
  unlockedBy?: number
  unlockedAt?: string
  status: 'locked' | 'unlock_requested' | 'unlocked'
  reason: string
}

export interface Message {
  id: number
  userId: number
  type: 'system' | 'sae' | 'query' | 'consent' | 'visit' | 'ethics' | 'data_lock' | 'performance' | 'randomization'
  title: string
  content: string
  read: boolean
  relatedId?: number
  relatedType?: string
  createdAt: string
}

export interface PerformanceReport {
  id: number
  trialId: number
  period: string
  enrollmentProgress: number
  qualityScore: number
  aeRate: number
  details: Record<string, any>
  generatedAt: string
}

export interface MonitoringTask {
  id: number
  trialId: number
  type: 'data_review' | 'site_visit' | 'follow_up' | 'verification'
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  assignedTo: number
  priority: 'high' | 'medium' | 'low'
  dueDate: string
  completedAt?: string
}

function createIdGenerator(): { next: () => number; current: () => number } {
  let id = 0
  return {
    next: () => ++id,
    current: () => id,
  }
}

export const userIds = createIdGenerator()
export const trialIds = createIdGenerator()
export const subjectIds = createIdGenerator()
export const consentIds = createIdGenerator()
export const crfIds = createIdGenerator()
export const queryIds = createIdGenerator()
export const saeIds = createIdGenerator()
export const randomizationIds = createIdGenerator()
export const ethicsIds = createIdGenerator()
export const visitIds = createIdGenerator()
export const dataLockIds = createIdGenerator()
export const messageIds = createIdGenerator()
export const performanceIds = createIdGenerator()
export const monitoringTaskIds = createIdGenerator()

export const users: User[] = [
  { id: userIds.next(), username: 'sponsor1', password: hash, name: '张申办', role: 'sponsor', email: 'sponsor1@trial.com', phone: '13800000001', createdAt: '2024-01-01T00:00:00Z' },
  { id: userIds.next(), username: 'sponsor2', password: hash, name: '李申办', role: 'sponsor', email: 'sponsor2@trial.com', phone: '13800000002', createdAt: '2024-01-02T00:00:00Z' },
  { id: userIds.next(), username: 'investigator1', password: hash, name: '王研究者', role: 'investigator', email: 'inv1@trial.com', phone: '13800000003', centerId: 1, createdAt: '2024-01-03T00:00:00Z' },
  { id: userIds.next(), username: 'investigator2', password: hash, name: '赵研究者', role: 'investigator', email: 'inv2@trial.com', phone: '13800000004', centerId: 2, createdAt: '2024-01-04T00:00:00Z' },
  { id: userIds.next(), username: 'crc1', password: hash, name: '刘CRC', role: 'crc', email: 'crc1@trial.com', phone: '13800000005', centerId: 1, createdAt: '2024-01-05T00:00:00Z' },
  { id: userIds.next(), username: 'crc2', password: hash, name: '陈CRC', role: 'crc', email: 'crc2@trial.com', phone: '13800000006', centerId: 2, createdAt: '2024-01-06T00:00:00Z' },
  { id: userIds.next(), username: 'dm1', password: hash, name: '杨数据', role: 'dm', email: 'dm1@trial.com', phone: '13800000007', createdAt: '2024-01-07T00:00:00Z' },
  { id: userIds.next(), username: 'dm2', password: hash, name: '黄数据', role: 'dm', email: 'dm2@trial.com', phone: '13800000008', createdAt: '2024-01-08T00:00:00Z' },
  { id: userIds.next(), username: 'ec1', password: hash, name: '周伦理', role: 'ec', email: 'ec1@trial.com', phone: '13800000009', createdAt: '2024-01-09T00:00:00Z' },
  { id: userIds.next(), username: 'ec2', password: hash, name: '吴伦理', role: 'ec', email: 'ec2@trial.com', phone: '13800000010', createdAt: '2024-01-10T00:00:00Z' },
  { id: userIds.next(), username: 'subject1', password: hash, name: '孙受试', role: 'subject', email: 'sub1@trial.com', phone: '13800000011', createdAt: '2024-02-01T00:00:00Z' },
  { id: userIds.next(), username: 'subject2', password: hash, name: '郑受试', role: 'subject', email: 'sub2@trial.com', phone: '13800000012', createdAt: '2024-02-02T00:00:00Z' },
]

export const trials: Trial[] = [
  {
    id: trialIds.next(),
    name: 'XYZ-001降压药III期临床试验',
    protocol: 'XYZ-001-PRO-V3.0',
    phase: 'III',
    status: 'ongoing',
    sponsorId: 1,
    startDate: '2024-03-01',
    endDate: '2025-12-31',
    targetEnrollment: 120,
    inclusionCriteria: [
      { id: 1, field: 'age', operator: '>=', value: 18, description: '年龄≥18岁' },
      { id: 2, field: 'age', operator: '<=', value: 75, description: '年龄≤75岁' },
      { id: 3, field: 'gender', operator: 'in', value: 'male,female', description: '性别不限' },
      { id: 4, field: 'sbp', operator: '>=', value: 140, description: '收缩压≥140mmHg' },
      { id: 5, field: 'dbp', operator: '>=', value: 90, description: '舒张压≥90mmHg' },
    ],
    exclusionCriteria: [
      { id: 1, field: 'conditions', operator: 'contains', value: 'liver_disease', description: '肝功能不全' },
      { id: 2, field: 'conditions', operator: 'contains', value: 'kidney_disease', description: '肾功能不全' },
      { id: 3, field: 'conditions', operator: 'contains', value: 'pregnancy', description: '妊娠期或哺乳期' },
      { id: 4, field: 'allergies', operator: 'contains', value: 'drug_allergy', description: '对试验药物过敏' },
    ],
    centers: [
      { id: 1, name: '北京中心医院', investigatorId: 3, crcId: 5, enrolledCount: 5 },
      { id: 2, name: '上海中心医院', investigatorId: 4, crcId: 6, enrolledCount: 3 },
    ],
  },
  {
    id: trialIds.next(),
    name: 'ABC-002糖尿病II期临床试验',
    protocol: 'ABC-002-PRO-V2.0',
    phase: 'II',
    status: 'ongoing',
    sponsorId: 2,
    startDate: '2024-06-01',
    endDate: '2025-06-30',
    targetEnrollment: 80,
    inclusionCriteria: [
      { id: 1, field: 'age', operator: '>=', value: 30, description: '年龄≥30岁' },
      { id: 2, field: 'age', operator: '<=', value: 70, description: '年龄≤70岁' },
      { id: 3, field: 'hba1c', operator: '>=', value: 7.0, description: '糖化血红蛋白≥7.0%' },
      { id: 4, field: 'hba1c', operator: '<=', value: 10.0, description: '糖化血红蛋白≤10.0%' },
      { id: 5, field: 'bmi', operator: '>=', value: 18.5, description: 'BMI≥18.5' },
      { id: 6, field: 'bmi', operator: '<=', value: 35.0, description: 'BMI≤35.0' },
    ],
    exclusionCriteria: [
      { id: 1, field: 'conditions', operator: 'contains', value: 'type1_diabetes', description: '1型糖尿病' },
      { id: 2, field: 'conditions', operator: 'contains', value: 'heart_failure', description: '心力衰竭' },
      { id: 3, field: 'creatinine', operator: '>', value: 1.5, description: '血肌酐>1.5mg/dL' },
    ],
    centers: [
      { id: 1, name: '北京中心医院', investigatorId: 3, crcId: 5, enrolledCount: 2 },
      { id: 2, name: '上海中心医院', investigatorId: 4, crcId: 6, enrolledCount: 2 },
    ],
  },
]

export const subjects: Subject[] = [
  { id: subjectIds.next(), trialId: 1, centerId: 1, subjectCode: 'XYZ-001-001', name: '孙明', gender: 'male', birthDate: '1985-03-15', status: 'active', enrolledDate: '2024-03-15', medicalConditions: ['hypertension'], medications: ['amlodipine'] },
  { id: subjectIds.next(), trialId: 1, centerId: 1, subjectCode: 'XYZ-001-002', name: '李华', gender: 'female', birthDate: '1970-08-22', status: 'completed', enrolledDate: '2024-03-20', medicalConditions: ['hypertension'], medications: ['metoprolol'] },
  { id: subjectIds.next(), trialId: 1, centerId: 1, subjectCode: 'XYZ-001-003', name: '王芳', gender: 'female', birthDate: '1990-01-10', status: 'screening', enrolledDate: '2024-06-01', medicalConditions: ['hypertension', 'pregnancy'], medications: [] },
  { id: subjectIds.next(), trialId: 1, centerId: 2, subjectCode: 'XYZ-001-004', name: '赵强', gender: 'male', birthDate: '1960-12-05', status: 'withdrawn', enrolledDate: '2024-04-10', withdrawnDate: '2024-07-15', withdrawnReason: '受试者主动退出', medicalConditions: ['hypertension', 'liver_disease'], medications: ['lisinopril'] },
  { id: subjectIds.next(), trialId: 1, centerId: 2, subjectCode: 'XYZ-001-005', name: '钱伟', gender: 'male', birthDate: '1975-06-30', status: 'randomized', enrolledDate: '2024-05-01', medicalConditions: ['hypertension'], medications: ['valsartan'] },
  { id: subjectIds.next(), trialId: 2, centerId: 1, subjectCode: 'ABC-002-001', name: '周丽', gender: 'female', birthDate: '1965-09-18', status: 'enrolled', enrolledDate: '2024-06-15', medicalConditions: ['type2_diabetes'], medications: ['metformin'] },
  { id: subjectIds.next(), trialId: 2, centerId: 2, subjectCode: 'ABC-002-002', name: '吴刚', gender: 'male', birthDate: '1978-04-25', status: 'eligible', enrolledDate: '2024-07-01', medicalConditions: ['type2_diabetes'], medications: ['glimepiride'] },
  { id: subjectIds.next(), trialId: 2, centerId: 1, subjectCode: 'ABC-002-003', name: '郑洁', gender: 'female', birthDate: '1982-11-08', status: 'consented', enrolledDate: '2024-07-10', medicalConditions: ['type2_diabetes'], medications: ['sitagliptin'] },
  { id: subjectIds.next(), trialId: 1, centerId: 1, subjectCode: 'XYZ-001-006', name: '冯磊', gender: 'male', birthDate: '1955-02-14', status: 'screening', enrolledDate: '2024-08-01', medicalConditions: ['hypertension', 'kidney_disease'], medications: ['furosemide'] },
]

export const consents: Consent[] = [
  { id: consentIds.next(), subjectId: 1, trialId: 1, version: 'V1.0', content: 'XYZ-001临床试验知情同意书，版本1.0...', subjectSignature: 'data:image/png;base64,subject_sig_1', subjectSignedAt: '2024-03-15T10:00:00Z', investigatorSignature: 'data:image/png;base64,inv_sig_1', investigatorSignedAt: '2024-03-15T10:05:00Z', locked: true, lockedAt: '2024-03-15T10:10:00Z', createdAt: '2024-03-14T00:00:00Z' },
  { id: consentIds.next(), subjectId: 2, trialId: 1, version: 'V1.0', content: 'XYZ-001临床试验知情同意书，版本1.0...', subjectSignature: 'data:image/png;base64,subject_sig_2', subjectSignedAt: '2024-03-20T09:00:00Z', investigatorSignature: 'data:image/png;base64,inv_sig_2', investigatorSignedAt: '2024-03-20T09:05:00Z', locked: true, lockedAt: '2024-03-20T09:10:00Z', createdAt: '2024-03-19T00:00:00Z' },
  { id: consentIds.next(), subjectId: 3, trialId: 1, version: 'V1.0', content: 'XYZ-001临床试验知情同意书，版本1.0...', locked: false, createdAt: '2024-05-30T00:00:00Z' },
  { id: consentIds.next(), subjectId: 8, trialId: 2, version: 'V1.0', content: 'ABC-002临床试验知情同意书，版本1.0...', subjectSignature: 'data:image/png;base64,subject_sig_8', subjectSignedAt: '2024-07-10T14:00:00Z', locked: false, createdAt: '2024-07-09T00:00:00Z' },
]

export const crfRecords: CRFRecord[] = [
  {
    id: crfIds.next(), subjectId: 1, trialId: 1, visitId: 1, formType: 'vital_signs',
    data: { sbp: 155, dbp: 98, heartRate: 72, temperature: 36.5, weight: 75.5, height: 172, visitDate: '2024-03-15' },
    status: 'verified', errors: [], createdAt: '2024-03-15T10:30:00Z', updatedAt: '2024-03-16T08:00:00Z',
  },
  {
    id: crfIds.next(), subjectId: 1, trialId: 1, visitId: 2, formType: 'vital_signs',
    data: { sbp: 145, dbp: 92, heartRate: 68, temperature: 36.3, weight: 74.8, height: 172, visitDate: '2024-04-15' },
    status: 'submitted', errors: [], createdAt: '2024-04-15T10:30:00Z', updatedAt: '2024-04-15T10:30:00Z',
  },
  {
    id: crfIds.next(), subjectId: 2, trialId: 1, visitId: 5, formType: 'vital_signs',
    data: { sbp: 250, dbp: 150, heartRate: 45, temperature: 36.6, weight: 62.0, height: 160, visitDate: '2024-06-20' },
    status: 'submitted',
    errors: [
      { field: 'sbp', message: '收缩压超出正常范围(90-200mmHg)', severity: 'error' },
      { field: 'dbp', message: '舒张压超出正常范围(60-120mmHg)', severity: 'error' },
      { field: 'heartRate', message: '心率偏低(正常60-100)', severity: 'warning' },
    ],
    createdAt: '2024-06-20T10:30:00Z', updatedAt: '2024-06-20T10:30:00Z',
  },
  {
    id: crfIds.next(), subjectId: 2, trialId: 1, visitId: 6, formType: 'lab_test',
    data: { alt: 85, ast: 72, creatinine: 0.9, bloodGlucose: 5.2, visitDate: '2024-07-20' },
    status: 'draft',
    errors: [{ field: 'alt', message: 'ALT偏高(正常0-40U/L)', severity: 'warning' }],
    createdAt: '2024-07-20T10:30:00Z', updatedAt: '2024-07-20T10:30:00Z',
  },
  {
    id: crfIds.next(), subjectId: 5, trialId: 1, visitId: 9, formType: 'vital_signs',
    data: { sbp: 138, dbp: 85, heartRate: 75, temperature: 36.4, weight: 80.0, height: 175 },
    status: 'draft', errors: [], createdAt: '2024-08-01T10:30:00Z', updatedAt: '2024-08-01T10:30:00Z',
  },
  {
    id: crfIds.next(), subjectId: 6, trialId: 2, visitId: 13, formType: 'lab_test',
    data: { hba1c: 8.5, fastingGlucose: 9.2, alt: 30, creatinine: 0.8, visitDate: '2024-06-15' },
    status: 'submitted', errors: [], createdAt: '2024-06-15T10:30:00Z', updatedAt: '2024-06-15T10:30:00Z',
  },
]

export const queries: Query[] = [
  { id: queryIds.next(), crfId: 3, subjectId: 2, trialId: 1, question: '请核实收缩压250mmHg是否为录入错误？', status: 'open', createdBy: 7, createdAt: '2024-06-21T09:00:00Z' },
  { id: queryIds.next(), crfId: 3, subjectId: 2, trialId: 1, question: '舒张压150mmHg是否为真实数据？', answer: '已核实，为录入错误，实际为95mmHg', status: 'answered', createdBy: 7, answeredBy: 5, createdAt: '2024-06-21T09:05:00Z', answeredAt: '2024-06-22T14:00:00Z' },
  { id: queryIds.next(), crfId: 4, subjectId: 2, trialId: 1, question: 'ALT 85U/L是否与既往病史相关？', answer: '受试者有轻度脂肪肝病史，已记录', status: 'closed', createdBy: 7, answeredBy: 3, createdAt: '2024-07-21T09:00:00Z', answeredAt: '2024-07-22T16:00:00Z' },
  { id: queryIds.next(), crfId: 5, subjectId: 5, trialId: 1, question: '请补充访视日期', status: 'open', createdBy: 8, createdAt: '2024-08-02T09:00:00Z' },
  { id: queryIds.next(), crfId: 6, subjectId: 6, trialId: 2, question: '空腹血糖9.2mmol/L是否需要在备注中说明？', status: 'open', createdBy: 7, createdAt: '2024-06-16T10:00:00Z' },
]

export const saeReports: SAEReport[] = [
  { id: saeIds.next(), subjectId: 4, trialId: 1, eventType: 'hospitalization', description: '受试者因严重头晕入院治疗，怀疑与试验药物相关', onsetDate: '2024-06-10', reportDate: '2024-06-10', deadline: '2024-06-25', status: 'submitted', reporterId: 4, causality: '可能相关', severity: '严重', assigneeId: 7, regulatoryStatus: 'submitted', processingRecords: [{ time: '2024-06-10', action: '提交SAE报告', operator: '赵研究者' }, { time: '2024-06-11', action: '进入审查', operator: '伦理委员会' }, { time: '2024-06-12', action: '提交监管机构', operator: '杨数据' }] },
  { id: saeIds.next(), subjectId: 1, trialId: 1, eventType: 'life_threatening', description: '受试者出现严重过敏反应，危及生命', onsetDate: '2024-07-01', reportDate: '2024-07-01', deadline: '2024-07-02', status: 'under_review', reporterId: 3, causality: '可能相关', severity: '危及生命', assigneeId: 7, regulatoryStatus: 'pending', processingRecords: [{ time: '2024-07-01', action: '提交SAE报告', operator: '王研究者' }, { time: '2024-07-01', action: '进入审查', operator: '伦理委员会' }] },
  { id: saeIds.next(), subjectId: 6, trialId: 2, eventType: 'other_serious', description: '受试者出现严重低血糖事件', onsetDate: '2024-08-05', reportDate: '2024-08-05', deadline: '2024-08-20', status: 'reported', reporterId: 3, causality: '很可能相关', severity: '严重', assigneeId: 8, regulatoryStatus: 'pending', processingRecords: [{ time: '2024-08-05', action: '提交SAE报告', operator: '王研究者' }] },
]

export const randomizations: Randomization[] = [
  { id: randomizationIds.next(), subjectId: 1, trialId: 1, drugCode: 'XYZ-A-001', group: '试验组', randomNum: 1, blockSize: 4, stratFactor: 'center_1', assignedAt: '2024-03-16T08:00:00Z' },
  { id: randomizationIds.next(), subjectId: 2, trialId: 1, drugCode: 'XYZ-B-002', group: '对照组', randomNum: 2, blockSize: 4, stratFactor: 'center_1', assignedAt: '2024-03-21T08:00:00Z' },
  { id: randomizationIds.next(), subjectId: 5, trialId: 1, drugCode: 'XYZ-A-003', group: '试验组', randomNum: 3, blockSize: 4, stratFactor: 'center_2', assignedAt: '2024-05-02T08:00:00Z' },
]

export const ethicsReviews: EthicsReview[] = [
  { id: ethicsIds.next(), trialId: 1, submissionType: 'initial', submittedBy: 1, submittedAt: '2024-01-15T00:00:00Z', status: 'approved', reviewerId: 9, reviewComment: '方案设计合理，同意开展', reviewedAt: '2024-02-01T00:00:00Z' },
  { id: ethicsIds.next(), trialId: 1, submissionType: 'annual', submittedBy: 1, submittedAt: '2024-12-01T00:00:00Z', status: 'pending' },
  { id: ethicsIds.next(), trialId: 2, submissionType: 'initial', submittedBy: 2, submittedAt: '2024-03-01T00:00:00Z', status: 'approved', reviewerId: 10, reviewComment: '符合伦理要求，批准开展', reviewedAt: '2024-04-01T00:00:00Z' },
  { id: ethicsIds.next(), trialId: 1, submissionType: 'sae', submittedBy: 3, submittedAt: '2024-07-02T00:00:00Z', status: 'rejected', reviewerId: 9, reviewComment: 'SAE报告不完整，请补充因果关系分析', reviewedAt: '2024-07-10T00:00:00Z' },
]

export const visitRecords: VisitRecord[] = [
  { id: visitIds.next(), subjectId: 1, trialId: 1, visitType: '筛选期访视', plannedDate: '2024-03-14', actualDate: '2024-03-14', status: 'completed', compliance: 'compliant', windowDays: { before: 3, after: 3 } },
  { id: visitIds.next(), subjectId: 1, trialId: 1, visitType: '基线访视', plannedDate: '2024-03-15', actualDate: '2024-03-15', status: 'completed', compliance: 'compliant', windowDays: { before: 0, after: 0 } },
  { id: visitIds.next(), subjectId: 1, trialId: 1, visitType: '第4周访视', plannedDate: '2024-04-12', actualDate: '2024-04-15', status: 'completed', compliance: 'partial', notes: '超出窗口期3天', windowDays: { before: 3, after: 3 } },
  { id: visitIds.next(), subjectId: 2, trialId: 1, visitType: '筛选期访视', plannedDate: '2024-03-19', actualDate: '2024-03-19', status: 'completed', compliance: 'compliant', windowDays: { before: 3, after: 3 } },
  { id: visitIds.next(), subjectId: 2, trialId: 1, visitType: '第8周访视', plannedDate: '2024-05-15', status: 'missed', compliance: 'non_compliant', notes: '受试者未到院', windowDays: { before: 3, after: 3 } },
  { id: visitIds.next(), subjectId: 5, trialId: 1, visitType: '筛选期访视', plannedDate: '2024-04-30', actualDate: '2024-04-30', status: 'completed', compliance: 'compliant', windowDays: { before: 3, after: 3 } },
  { id: visitIds.next(), subjectId: 6, trialId: 2, visitType: '筛选期访视', plannedDate: '2024-06-14', actualDate: '2024-06-14', status: 'completed', compliance: 'compliant', windowDays: { before: 3, after: 3 } },
  { id: visitIds.next(), subjectId: 6, trialId: 2, visitType: '基线访视', plannedDate: '2024-06-15', actualDate: '2024-06-15', status: 'completed', compliance: 'compliant', windowDays: { before: 0, after: 0 } },
  { id: visitIds.next(), subjectId: 7, trialId: 2, visitType: '筛选期访视', plannedDate: '2024-06-28', status: 'planned', compliance: 'pending', windowDays: { before: 3, after: 3 } },
  { id: visitIds.next(), subjectId: 8, trialId: 2, visitType: '基线访视', plannedDate: '2024-07-12', actualDate: '2024-07-10', status: 'completed', compliance: 'compliant', windowDays: { before: 3, after: 3 } },
]

export const dataLocks: DataLock[] = [
  { id: dataLockIds.next(), trialId: 1, lockedBy: 7, lockedAt: '2024-07-01T00:00:00Z', status: 'locked', reason: '中期分析数据锁定' },
]

export const messages: Message[] = [
  { id: messageIds.next(), userId: 1, type: 'sae', title: '新的SAE报告', content: '受试者XYZ-001-001报告危及生命的严重不良事件', read: false, relatedId: 2, relatedType: 'sae', createdAt: '2024-07-01T10:00:00Z' },
  { id: messageIds.next(), userId: 9, type: 'sae', title: 'SAE报告待审核', content: '受试者XYZ-001-001报告危及生命的严重不良事件，请尽快审核', read: false, relatedId: 2, relatedType: 'sae', createdAt: '2024-07-01T10:01:00Z' },
  { id: messageIds.next(), userId: 5, type: 'query', title: '新增质疑', content: 'CRF记录存在异常数据，请核实', read: true, relatedId: 1, relatedType: 'query', createdAt: '2024-06-21T09:00:00Z' },
  { id: messageIds.next(), userId: 3, type: 'consent', title: '知情同意待签署', content: '受试者XYZ-001-003的知情同意书待签署', read: true, relatedId: 3, relatedType: 'consent', createdAt: '2024-05-30T08:00:00Z' },
  { id: messageIds.next(), userId: 6, type: 'visit', title: '访视提醒', content: '受试者XYZ-001-002第8周访视已超期', read: false, relatedId: 5, relatedType: 'visit', createdAt: '2024-05-16T08:00:00Z' },
  { id: messageIds.next(), userId: 7, type: 'data_lock', title: '数据锁定通知', content: '试验XYZ-001数据已锁定，锁定原因：中期分析', read: true, relatedId: 1, relatedType: 'data_lock', createdAt: '2024-07-01T00:00:00Z' },
  { id: messageIds.next(), userId: 8, type: 'data_lock', title: '数据锁定通知', content: '试验XYZ-001数据已锁定，锁定原因：中期分析', read: false, relatedId: 1, relatedType: 'data_lock', createdAt: '2024-07-01T00:00:00Z' },
  { id: messageIds.next(), userId: 1, type: 'performance', title: '月度绩效报告', content: '2024年6月绩效报告已生成', read: true, relatedId: 1, relatedType: 'performance', createdAt: '2024-07-01T06:00:00Z' },
  { id: messageIds.next(), userId: 2, type: 'ethics', title: '伦理审查结果', content: '试验ABC-002的伦理审查已批准', read: true, relatedId: 3, relatedType: 'ethics', createdAt: '2024-04-01T10:00:00Z' },
  { id: messageIds.next(), userId: 3, type: 'randomization', title: '随机化分配通知', content: '受试者XYZ-001-005已随机分配至试验组', read: true, relatedId: 3, relatedType: 'randomization', createdAt: '2024-05-02T08:00:00Z' },
  { id: messageIds.next(), userId: 4, type: 'sae', title: '新的SAE报告', content: '受试者XYZ-001-004因严重头晕入院', read: false, relatedId: 1, relatedType: 'sae', createdAt: '2024-06-10T15:00:00Z' },
  { id: messageIds.next(), userId: 5, type: 'query', title: '新增质疑', content: '受试者XYZ-001-002的CRF记录存在异常血压数据', read: false, relatedId: 2, relatedType: 'query', createdAt: '2024-06-21T09:05:00Z' },
]

export const performanceReports: PerformanceReport[] = [
  {
    id: performanceIds.next(), trialId: 1, period: '2024-06',
    enrollmentProgress: 50, qualityScore: 85, aeRate: 12.5,
    details: {
      totalEnrolled: 6, targetEnrollment: 120,
      screeningFailure: 1, withdrawal: 1,
      queriesOpen: 2, queriesClosed: 1,
      saeCount: 2, complianceRate: 80,
    },
    generatedAt: '2024-07-01T06:00:00Z',
  },
  {
    id: performanceIds.next(), trialId: 2, period: '2024-07',
    enrollmentProgress: 50, qualityScore: 90, aeRate: 0,
    details: {
      totalEnrolled: 4, targetEnrollment: 80,
      screeningFailure: 0, withdrawal: 0,
      queriesOpen: 1, queriesClosed: 0,
      saeCount: 1, complianceRate: 95,
    },
    generatedAt: '2024-08-01T06:00:00Z',
  },
]

export const monitoringTasks: MonitoringTask[] = [
  { id: monitoringTaskIds.next(), trialId: 1, type: 'data_review', description: '审核受试者XYZ-001-002异常血压数据', status: 'pending', assignedTo: 7, priority: 'high', dueDate: '2024-06-25' },
  { id: monitoringTaskIds.next(), trialId: 1, type: 'site_visit', description: '北京中心医院现场监查', status: 'in_progress', assignedTo: 8, priority: 'medium', dueDate: '2024-07-15' },
  { id: monitoringTaskIds.next(), trialId: 1, type: 'follow_up', description: '跟进SAE报告处理进度', status: 'pending', assignedTo: 7, priority: 'high', dueDate: '2024-07-05' },
  { id: monitoringTaskIds.next(), trialId: 2, type: 'verification', description: '核实受试者ABC-002-001入组资格', status: 'completed', assignedTo: 8, priority: 'low', dueDate: '2024-06-30', completedAt: '2024-06-28T16:00:00Z' },
]

export function findById<T extends { id: number }>(arr: T[], id: number): T | undefined {
  return arr.find(item => item.id === id)
}

export function findAll<T>(arr: T[]): T[] {
  return arr
}

export function create<T extends { id: number }>(arr: T[], item: T): T {
  arr.push(item)
  return item
}

export function update<T extends { id: number }>(arr: T[], id: number, updates: Partial<T>): T | undefined {
  const index = arr.findIndex(item => item.id === id)
  if (index === -1) return undefined
  arr[index] = { ...arr[index], ...updates }
  return arr[index]
}

export function pushMessage(userId: number, type: Message['type'], title: string, content: string, relatedId?: number, relatedType?: string): Message {
  const msg: Message = {
    id: messageIds.next(),
    userId, type, title, content,
    read: false,
    relatedId, relatedType,
    createdAt: new Date().toISOString(),
  }
  messages.push(msg)
  return msg
}

export function pushMessageToUsers(userIds: number[], type: Message['type'], title: string, content: string, relatedId?: number, relatedType?: string): Message[] {
  return userIds.map(uid => pushMessage(uid, type, title, content, relatedId, relatedType))
}

export function getUsersByRole(role: User['role']): User[] {
  return users.filter(u => u.role === role)
}
