import type { LabResult } from '@/lib/lab-schema'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'

export function ExplanationCards({ results }: { results: LabResult[] }) {
  const sorted = [...results].sort((a, b) => Number(a.status === 'normal') - Number(b.status === 'normal'))

  return (
    <section aria-labelledby="explanations-heading">
      <h2 id="explanations-heading" className="font-semibold">
        What each test measures
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Plain-language explanations, with flagged results first.</p>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {sorted.map((r) => (
          <li
            key={r.id}
            id={`explain-${r.id}`}
            className={cn(
              'scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm',
              r.status === 'high' && 'border-l-4 border-l-status-high',
              r.status === 'low' && 'border-l-4 border-l-status-low',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{r.name}</h3>
                <p className="mt-0.5 font-mono text-sm tabular-nums text-muted-foreground">
                  {r.value} {r.unit}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <dl className="mt-4 flex flex-col gap-3 text-sm leading-relaxed">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What it measures</dt>
                <dd className="mt-1 text-pretty">{r.measures}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your result</dt>
                <dd className="mt-1 text-pretty">{r.meaning}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  )
}
