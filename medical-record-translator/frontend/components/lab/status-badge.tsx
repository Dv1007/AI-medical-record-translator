import { ArrowDown, ArrowUp, Check } from 'lucide-react'
import type { ResultStatus } from '@/lib/lab-schema'
import { cn } from '@/lib/utils'

const config: Record<ResultStatus, { label: string; className: string; Icon: typeof Check }> = {
  normal: {
    label: 'Normal',
    className: 'bg-status-normal-soft text-status-normal ring-status-normal/20',
    Icon: Check,
  },
  high: {
    label: 'High',
    className: 'bg-status-high-soft text-status-high ring-status-high/20',
    Icon: ArrowUp,
  },
  low: {
    label: 'Low',
    className: 'bg-status-low-soft text-status-low ring-status-low/25',
    Icon: ArrowDown,
  },
}

export function StatusBadge({ status, className }: { status: ResultStatus; className?: string }) {
  const { label, className: tone, Icon } = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tone,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  )
}
