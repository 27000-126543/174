import cron from 'node-cron'
import { trials, visitRecords, subjects, messages, messageIds, create, getUsersByRole } from '../db.js'
import { generateReport } from './performance.js'

function checkVisitReminders() {
  const today = new Date()
  const next3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  const plannedVisits = visitRecords.filter(v => v.status === 'planned')
  for (const visit of plannedVisits) {
    const planned = new Date(visit.plannedDate)
    if (planned >= today && planned <= next3Days) {
      const subject = subjects.find(s => s.id === visit.subjectId)
      const crcUsers = getUsersByRole('crc').map(u => u.id)
      for (const uid of crcUsers) {
        const existing = messages.find(
          m => m.userId === uid && m.relatedId === visit.id && m.relatedType === 'visit' && m.type === 'visit'
        )
        if (!existing) {
          create(messages, {
            id: messageIds.next(),
            userId: uid,
            type: 'visit',
            title: '访视提醒',
            content: `受试者${subject?.name}的${visit.visitType}计划于${visit.plannedDate}进行，请及时安排`,
            read: false,
            relatedId: visit.id,
            relatedType: 'visit',
            createdAt: new Date().toISOString(),
          })
        }
      }
    }
    if (planned < today) {
      const subject = subjects.find(s => s.id === visit.subjectId)
      const crcUsers = getUsersByRole('crc').map(u => u.id)
      for (const uid of crcUsers) {
        const existing = messages.find(
          m => m.userId === uid && m.relatedId === visit.id && m.relatedType === 'visit' && m.title === '访视逾期提醒'
        )
        if (!existing) {
          create(messages, {
            id: messageIds.next(),
            userId: uid,
            type: 'visit',
            title: '访视逾期提醒',
            content: `受试者${subject?.name}的${visit.visitType}已逾期，计划日期${visit.plannedDate}`,
            read: false,
            relatedId: visit.id,
            relatedType: 'visit',
            createdAt: new Date().toISOString(),
          })
        }
      }
    }
  }
}

function generateMonthlyReports() {
  for (const trial of trials) {
    generateReport(trial.id)
  }
}

export function startCronJobs() {
  cron.schedule('0 2 * * *', () => {
    console.log('[Cron] 每日访视提醒检查...')
    checkVisitReminders()
  })

  cron.schedule('0 6 1 * *', () => {
    console.log('[Cron] 月度绩效报告生成...')
    generateMonthlyReports()
  })

  console.log('[Cron] 定时任务已启动')
}
