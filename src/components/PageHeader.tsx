import { FileText } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ElementType | React.ReactNode
}

export default function PageHeader({ title, subtitle, action, icon = FileText }: PageHeaderProps) {
  const renderIcon = () => {
    try {
      if (icon && typeof icon === 'object' && '$$typeof' in icon) {
        const Icon = icon as any
        return (
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-teal-700" />
          </div>
        )
      }
      if (typeof icon === 'function') {
        const Icon = icon
        return (
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-teal-700" />
          </div>
        )
      }
      if (icon) {
        return (
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            {icon}
          </div>
        )
      }
    } catch {
      return (
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-teal-700" />
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {renderIcon()}
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
