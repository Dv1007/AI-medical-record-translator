'use client'

import { AlertCircle, CheckCircle2, FileText, LogOut, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LabReport } from '@/lib/lab-schema'
import { countFlagged, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BrandMark } from './brand-mark'
import type { MockUser } from './login-page'

type HistorySidebarProps = {
  user: MockUser
  reports: LabReport[]
  activeReportId: string | null
  onSelectReport: (id: string) => void
  onNewAnalysis: () => void
  onLogout: () => void
}

export function HistorySidebar({
  user,
  reports,
  activeReportId,
  onSelectReport,
  onNewAnalysis,
  onLogout,
}: HistorySidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pt-5 pb-4">
        <BrandMark />
      </div>

      <div className="px-4">
        <Button className="h-10 w-full" onClick={onNewAnalysis}>
          <Plus aria-hidden="true" />
          New analysis
        </Button>
      </div>

      <nav aria-labelledby="history-heading" className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-5 pb-2">
          <h2 id="history-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent history
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">{reports.length}</span>
        </div>

        {reports.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">No reports yet. Upload one to get started.</p>
        ) : (
          <ul className="flex flex-col gap-1 overflow-y-auto px-3 pb-4">
            {reports.map((report) => {
              const flagged = countFlagged(report)
              const isActive = report.id === activeReportId
              return (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => onSelectReport(report.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-muted',
                    )}
                  >
                    <FileText
                      className={cn('mt-0.5 size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                      aria-hidden="true"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-medium">{report.fileName}</span>
                      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <time dateTime={report.reportDate}>{formatDate(report.reportDate)}</time>
                        {flagged > 0 ? (
                          <span className="inline-flex items-center gap-1 font-medium text-status-high">
                            <AlertCircle className="size-3" aria-hidden="true" />
                            {flagged} flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-status-normal">
                            <CheckCircle2 className="size-3" aria-hidden="true" />
                            All normal
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
          aria-hidden="true"
        >
          {user.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out">
          <LogOut aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
