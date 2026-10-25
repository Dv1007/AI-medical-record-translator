import { CalendarDays, FileText } from 'lucide-react'
import type { LabReport } from '@/lib/lab-schema'
import { formatDate } from '@/lib/format'
import { getSourcesForReport } from '@/lib/sources'
import { AppointmentPrep } from './appointment-prep'
import { ExplanationCards } from './explanation-cards'
import { MedicalDisclaimer } from './medical-disclaimer'
import { ResultsTable } from './results-table'
import { SourcesTable } from './sources-table'

export function ResultsDashboard({ report }: { report: LabReport }) {
  const counts = {
    normal: report.results.filter((r) => r.status === 'normal').length,
    high: report.results.filter((r) => r.status === 'high').length,
    low: report.results.filter((r) => r.status === 'low').length,
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-6 sm:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Your results</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-4" aria-hidden="true" />
            {report.fileName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden="true" />
            <time dateTime={report.reportDate}>{formatDate(report.reportDate)}</time>
          </span>
        </div>
      </header>

      <MedicalDisclaimer />

      <section aria-labelledby="summary-heading" className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 id="summary-heading" className="font-semibold">
          Summary
        </h2>
        <p className="mt-2 text-pretty leading-relaxed">{report.summary}</p>
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Normal', value: counts.normal, tone: 'bg-status-normal-soft text-status-normal' },
            { label: 'High', value: counts.high, tone: 'bg-status-high-soft text-status-high' },
            { label: 'Low', value: counts.low, tone: 'bg-status-low-soft text-status-low' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg px-4 py-3 ${stat.tone}`}>
              <dt className="text-xs font-medium uppercase tracking-wider">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <SourcesTable sources={report.sources?.length ? report.sources : getSourcesForReport(report)} />

      <ResultsTable results={report.results} />

      <ExplanationCards results={report.results} />

      <AppointmentPrep key={report.id} report={report} />
    </div>
  )
}
