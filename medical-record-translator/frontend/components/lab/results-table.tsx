import type { LabResult } from '@/lib/lab-schema'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'

export function ResultsTable({ results }: { results: LabResult[] }) {
  return (
    <section aria-labelledby="results-heading" className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 id="results-heading" className="font-semibold">
          Lab results
        </h2>
        <span className="text-sm text-muted-foreground">{results.length} tests</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-5 py-3 font-medium">
                Test name
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Value
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Unit
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Reference range
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-muted/40">
                <th scope="row" className="px-5 py-3.5 text-left font-medium">
                  <a href={`#explain-${r.id}`} className="underline-offset-4 hover:underline">
                    {r.name}
                  </a>
                </th>
                <td
                  className={cn(
                    'px-5 py-3.5 text-right font-mono tabular-nums',
                    r.status === 'high' && 'font-semibold text-status-high',
                    r.status === 'low' && 'font-semibold text-status-low',
                  )}
                >
                  {r.value}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{r.unit || '—'}</td>
                <td className="px-5 py-3.5 font-mono tabular-nums text-muted-foreground">{r.referenceRange || '—'}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
