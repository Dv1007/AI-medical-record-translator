import { ExternalLink } from 'lucide-react'
import type { Source } from '@/lib/sources'

export function SourcesTable({ sources }: { sources: Source[] }) {
  return (
    <section aria-labelledby="sources-heading" className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 id="sources-heading" className="font-semibold">
          Sources
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Recognized health authorities used to inform these explanations.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-5 py-3 font-medium">
                Source Name
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Authority / Organization
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Link / Citation
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sources.map((s) => (
              <tr key={s.url}>
                <th scope="row" className="px-5 py-3.5 text-left font-medium">
                  {s.name}
                </th>
                <td className="px-5 py-3.5 text-muted-foreground">{s.organization}</td>
                <td className="px-5 py-3.5">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 break-all font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {s.url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
