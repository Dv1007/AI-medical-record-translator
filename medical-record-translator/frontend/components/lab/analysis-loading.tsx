'use client'

import { useEffect, useState } from 'react'
import { Check, FileSearch, Loader2, MessageSquareText, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ANALYSIS_STEPS = [
  { label: 'Extracting laboratory data...', Icon: ScanLine },
  { label: 'Analyzing results...', Icon: FileSearch },
  { label: 'Preparing medical explanations...', Icon: MessageSquareText },
] as const

const STEP_DURATION_MS = 1800

export function AnalysisLoading({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1))
    }, STEP_DURATION_MS)
    return () => clearInterval(timer)
  }, [])

  const progress = Math.round(((step + 1) / ANALYSIS_STEPS.length) * 90)
  const CurrentIcon = ANALYSIS_STEPS[step].Icon

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center py-16 text-center sm:py-24">
      <div className="relative flex size-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/10 [animation-duration:2s]" />
        <span className="absolute inset-2 rounded-full bg-secondary" />
        <CurrentIcon key={step} className="relative size-10 text-primary animate-in fade-in zoom-in-75" aria-hidden="true" />
      </div>

      <p className="mt-8 truncate text-sm text-muted-foreground" title={fileName}>
        {fileName}
      </p>
      <h1 aria-live="polite" className="mt-2 text-xl font-semibold tracking-tight" key={step}>
        <span className="inline-block animate-in fade-in slide-in-from-bottom-1">{ANALYSIS_STEPS[step].label}</span>
      </h1>

      <div
        className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Analysis progress"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <ol className="mt-8 flex w-full flex-col gap-3 text-left">
        {ANALYSIS_STEPS.map(({ label }, i) => {
          const done = i < step
          const active = i === step
          return (
            <li
              key={label}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                active && 'border-primary/30 bg-accent',
                !active && !done && 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full',
                  done ? 'bg-primary text-primary-foreground' : active ? 'text-primary' : 'bg-muted',
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="text-xs tabular-nums">{i + 1}</span>
                )}
              </span>
              {label.replace('...', '')}
              <span className="sr-only">{done ? '(complete)' : active ? '(in progress)' : '(pending)'}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
