export type UserRole = 'sponsor' | 'investigator' | 'crc' | 'dm' | 'ec' | 'subject'

export interface User {
  id: string
  username: string
  role: UserRole
  name: string
  email: string
  phone: string
}

export type SubjectStatus =
  | 'enrolled'
  | 'screening'
  | 'eligible'
  | 'consented'
  | 'randomized'
  | 'active'
  | 'completed'
  | 'withdrawn'

export interface Subject {
  id: string
  name: string
  gender: string
  age: number
  phone: string
  idNumber: string
  status: SubjectStatus
  trialId: string
  siteId: string
  screenResult: ScreeningResult | null
  randomizationId: string | null
}

export interface ScreeningResult {
  eligible: boolean
  score: number
  details: ScreeningDetail[]
}

export interface ScreeningDetail {
  criterion: string
  passed: boolean
  reason: string
}

export interface Consent {
  id: string
  subjectId: string
  content: string
  subjectSignature: string
  investigatorSignature: string
  signedAt: string
  isLocked: boolean
}

export interface CRFRecord {
  id: string
  subjectId: string
  visitId: string
  module: string
  data: Record<string, any>
  status: string
  createdAt: string
  updatedAt: string
}

export interface Query {
  id: string
  crfRecordId: string
  type: string
  description: string
  status: string
  response: string
  createdBy: string
  createdAt: string
  resolvedAt: string | null
}

export interface SAEReport {
  id: string
  subjectId: string
  eventType: string
  description: string
  onsetDate: string
  reportDate: string
  severity: string
  causality: string
  status: string
  deadline: string
}

export interface Randomization {
  id: string
  subjectId: string
  randomNumber: string
  drugCode: string
  stratum: string
  assignedAt: string
}

export interface EthicsReview {
  id: string
  trialId: string
  documentType: string
  status: string
  reviewerOpinion: string
  reviewedAt: string
}

export interface VisitRecord {
  id: string
  subjectId: string
  visitCycle: string
  plannedDate: string
  actualDate: string | null
  complianceStatus: string
  reminderSent: boolean
}

export interface DataLock {
  id: string
  trialId: string
  scope: string
  lockedAt: string
  lockedBy: string
  status: string
}

export interface Message {
  id: string
  userId: string
  type: string
  title: string
  content: string
  isRead: boolean
  certificateUrl: string | null
  createdAt: string
}

export interface Trial {
  id: string
  name: string
  phase: string
  status: string
  inclusionCriteria: string[]
  exclusionCriteria: string[]
}

export interface PerformanceReport {
  id: string
  trialId: string
  month: number
  year: number
  enrollmentData: Record<string, number>
  qualityScore: number
  aeRate: number
  generatedAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
