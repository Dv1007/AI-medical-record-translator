'use client'

import { useId, useRef, useState } from 'react'
import { FileText, Play, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_BYTES = 10 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type UploadPanelProps = {
  error: string | null
  onAnalyze: (file: File) => void
  onUseSample: () => void
}

export function UploadPanel({ error, onAnalyze, onUseSample }: UploadPanelProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return
    if (candidate.type !== 'application/pdf') {
      setValidationError('Only PDF files are supported.')
      return
    }
    if (candidate.size > MAX_BYTES) {
      setValidationError('File must be 10 MB or smaller.')
      return
    }
    setValidationError(null)
    setFile(candidate)
  }

  function clearFile() {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const message = validationError ?? error

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6 sm:py-12">
      <header>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Analyze a lab report</h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Upload a PDF of your lab results. We&apos;ll organize the data, explain each test in plain language, and
          help you prepare questions for your healthcare professional.
        </p>
      </header>

      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            acceptFile(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40',
            isDragging ? 'border-primary bg-accent' : 'border-input bg-muted/40 hover:border-primary/60 hover:bg-accent/50',
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
            <UploadCloud className="size-7" aria-hidden="true" />
          </span>
          <span className="mt-4 text-base font-medium">
            {isDragging ? 'Drop your PDF here' : 'Drag and drop your lab report'}
          </span>
          <span className="mt-1 text-sm text-muted-foreground">
            or <span className="font-medium text-primary underline underline-offset-4">browse files</span> · PDF up to
            10 MB
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </label>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-status-high-soft text-status-high">
              <FileText className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={clearFile} aria-label={`Remove ${file.name}`}>
              <X aria-hidden="true" />
            </Button>
          </div>
        )}

        {message && (
          <p role="alert" className="mt-4 rounded-lg bg-status-high-soft px-4 py-3 text-sm text-status-high">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onUseSample}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            No report handy? Try a sample
          </button>
          <Button size="lg" className="h-11 px-6" disabled={!file} onClick={() => file && onAnalyze(file)}>
            <Play aria-hidden="true" />
            Start Analysis
          </Button>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Your file is sent securely for analysis and is not stored on our servers.
      </p>
    </div>
  )
}
