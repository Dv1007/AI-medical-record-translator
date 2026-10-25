import type { LabReport } from './lab-schema'

export function formatDate(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function countFlagged(report: LabReport) {
  return report.results.filter((r) => r.status !== 'normal').length
}
