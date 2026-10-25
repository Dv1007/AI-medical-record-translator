'use client'

import { useMemo, useState } from 'react'
import { Check, ClipboardList, Copy, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LabReport } from '@/lib/lab-schema'
import { generateAppointmentQuestions } from '@/lib/appointment-questions'
import { cn } from '@/lib/utils'

export function AppointmentPrep({ report }: { report: LabReport }) {
  const questions = useMemo(() => generateAppointmentQuestions(report), [report])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const selected = questions.filter((q) => !excluded.has(q.id))
  const flagged = questions.filter((q) => q.priority === 'flagged')
  const general = questions.filter((q) => q.priority === 'general')

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copyQuestions() {
    const text = selected.map((q, i) => `${i + 1}. ${q.question}`).join('\n')
    await navigator.clipboard.writeText(`Questions about my lab report (${report.fileName}):\n\n${text}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section aria-labelledby="prep-heading" className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <ClipboardList className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="prep-heading" className="font-semibold">
              Appointment prep
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Questions generated from your results. Uncheck any you don&apos;t need.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
          <Button onClick={copyQuestions} disabled={selected.length === 0}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? 'Copied' : `Copy ${selected.length}`}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {flagged.length > 0 && (
          <QuestionGroup title="About your flagged results" questions={flagged} excluded={excluded} onToggle={toggle} />
        )}
        <QuestionGroup title="General questions" questions={general} excluded={excluded} onToggle={toggle} />
      </div>
    </section>
  )
}

function QuestionGroup({
  title,
  questions,
  excluded,
  onToggle,
}: {
  title: string
  questions: ReturnType<typeof generateAppointmentQuestions>
  excluded: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</legend>
      <ul className="mt-3 flex flex-col gap-2">
        {questions.map((q) => {
          const checked = !excluded.has(q.id)
          return (
            <li key={q.id}>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40',
                  checked ? 'bg-background' : 'bg-muted/40 text-muted-foreground',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(q.id)}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span className="flex flex-col gap-1">
                  {q.topic !== 'General' && (
                    <span className="text-xs font-medium text-primary">{q.topic}</span>
                  )}
                  <span className={cn('text-pretty text-sm leading-relaxed', !checked && 'line-through')}>
                    {q.question}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
