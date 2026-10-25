'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LabAnalysis, LabReport } from '@/lib/lab-schema'
import { demoSampleReport, sampleReports } from '@/lib/sample-reports'
import { cn } from '@/lib/utils'
import { ANALYSIS_STEPS, AnalysisLoading } from './analysis-loading'
import { BrandMark } from './brand-mark'
import { HistorySidebar } from './history-sidebar'
import { LoginPage, type MockUser } from './login-page'
import { ResultsDashboard } from './results-dashboard'
import { UploadPanel } from './upload-panel'

type View = { kind: 'upload' } | { kind: 'loading'; fileName: string } | { kind: 'results'; reportId: string }

const MIN_LOADING_MS = ANALYSIS_STEPS.length * 1800 + 400

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function analyzePdf(file: File): Promise<LabAnalysis> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/analyze', { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Analysis failed. Please try again.')
  return data as LabAnalysis
}

export function AppShell() {
  const [user, setUser] = useState<MockUser | null>(null)
  const [reports, setReports] = useState<LabReport[]>(sampleReports)
  const [view, setView] = useState<View>({ kind: 'upload' })
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) return <LoginPage onLogin={setUser} />

  const activeReport = view.kind === 'results' ? reports.find((r) => r.id === view.reportId) : undefined

  function addReport(report: LabReport) {
    setReports((prev) => [report, ...prev])
    setView({ kind: 'results', reportId: report.id })
  }

  async function runAnalysis(fileName: string, task: () => Promise<Omit<LabReport, 'id' | 'analyzedAt'>>) {
    setError(null)
    setView({ kind: 'loading', fileName })
    try {
      const [data] = await Promise.all([task(), wait(MIN_LOADING_MS)])
      addReport({ ...data, id: crypto.randomUUID(), analyzedAt: new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
      setView({ kind: 'upload' })
    }
  }

  function handleAnalyze(file: File) {
    runAnalysis(file.name, async () => {
      const analysis = await analyzePdf(file)
      return {
        fileName: file.name,
        reportDate: analysis.reportDate ?? new Date().toISOString().slice(0, 10),
        summary: analysis.summary,
        results: analysis.results.map((r) => ({ ...r, id: crypto.randomUUID() })),
        sources: analysis.sources,
      }
    })
  }

  function handleUseSample() {
    runAnalysis(demoSampleReport.fileName, async () => demoSampleReport)
  }

  function navigate(next: View) {
    setError(null)
    setView(next)
    setSidebarOpen(false)
    window.scrollTo({ top: 0 })
  }

  const isLoading = view.kind === 'loading'

  return (
    <div className="flex min-h-dvh">
      <div
        className={cn(
          'fixed inset-0 z-30 bg-foreground/30 transition-opacity lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-sidebar-border transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isLoading && 'pointer-events-none opacity-60',
        )}
        aria-label="Report history"
      >
        <HistorySidebar
          user={user}
          reports={reports}
          activeReportId={activeReport?.id ?? null}
          onSelectReport={(id) => navigate({ kind: 'results', reportId: id })}
          onNewAnalysis={() => navigate({ kind: 'upload' })}
          onLogout={() => {
            setUser(null)
            setView({ kind: 'upload' })
            setReports(sampleReports)
          }}
        />
        {sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-3 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close history"
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open history">
            <Menu aria-hidden="true" />
          </Button>
          <BrandMark />
        </header>
        <main className="flex-1 px-4 sm:px-8">
          {view.kind === 'upload' && (
            <UploadPanel error={error} onAnalyze={handleAnalyze} onUseSample={handleUseSample} />
          )}
          {view.kind === 'loading' && <AnalysisLoading fileName={view.fileName} />}
          {view.kind === 'results' && activeReport && <ResultsDashboard report={activeReport} />}
        </main>
      </div>
    </div>
  )
}
