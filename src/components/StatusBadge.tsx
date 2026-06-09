interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  type?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待审查', className: 'bg-amber-50 text-amber-600' },
  approved: { label: '已批准', className: 'bg-green-50 text-green-600' },
  rejected: { label: '已驳回', className: 'bg-red-50 text-red-600' },
  locked: { label: '已锁定', className: 'bg-red-50 text-red-600' },
  unlocked: { label: '未锁定', className: 'bg-green-50 text-green-600' },
  completed: { label: '已完成', className: 'bg-green-50 text-green-600' },
  missed: { label: '已错过', className: 'bg-red-50 text-red-600' },
  late: { label: '延迟', className: 'bg-amber-50 text-amber-600' },
  scheduled: { label: '计划中', className: 'bg-slate-50 text-slate-500' },
  active: { label: '进行中', className: 'bg-teal-50 text-teal-700' },
  draft: { label: '草稿', className: 'bg-slate-50 text-slate-500' },
  submitted: { label: '已提交', className: 'bg-blue-50 text-blue-600' },
}

export default function StatusBadge({ status, size = 'sm', type: _type }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-50 text-slate-500' }
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClass}`}>
      {config.label}
    </span>
  )
}
