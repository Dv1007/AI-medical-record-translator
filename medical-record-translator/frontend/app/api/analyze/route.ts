export const maxDuration = 120

declare const process: { env: Record<string, string | undefined> }

const MAX_FILE_BYTES = 10 * 1024 * 1024
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

const categories = [
  'blood_count',
  'metabolic',
  'lipid',
  'diabetes',
  'thyroid',
  'liver',
  'kidney',
  'vitamin',
  'other',
] as const

type ResultStatus = 'normal' | 'high' | 'low' | 'unverified'
type Candidate = Record<string, unknown>
type TestExplanation = {
  name: string
  measures: string
  meaning: string
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeStatus(value: unknown): ResultStatus | undefined {
  if (typeof value !== 'string') return undefined

  const status = value.trim().toLowerCase()

  if (
    status === 'normal' ||
    status === 'within_range' ||
    status === 'within range' ||
    status === 'n'
  ) return 'normal'

  if (
    status === 'high' ||
    status === 'above_range' ||
    status === 'above range' ||
    status === 'h'
  ) return 'high'

  if (
    status === 'low' ||
    status === 'below_range' ||
    status === 'below range' ||
    status === 'l'
  ) return 'low'

  return undefined
}

function classifyAgainstRange(
  value: string,
  unit: string,
  referenceRange: string,
): ResultStatus {
  if (!unit.trim()) return 'unverified'

  const valueMatch = value.trim().match(/^(-?\d+(?:\.\d+)?)$/)
  const range = referenceRange.trim().replace(
    /^\s*(?:reference\s*)?range\s*[:=]\s*/i,
    '',
  )

  if (!valueMatch) return 'unverified'

  const number = Number(valueMatch[1])
  if (!Number.isFinite(number)) return 'unverified'

  const bounded = range.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)(?:\s|$)/i,
  )

  if (bounded) {
    const low = Number(bounded[1])
    const high = Number(bounded[2])

    if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) {
      return 'unverified'
    }

    if (number < low) return 'low'
    if (number > high) return 'high'
    return 'normal'
  }

  const oneSided = range.match(
    /^\s*(<=|<|>=|>|≤|≥)\s*(-?\d+(?:\.\d+)?)(?:\s|$)/,
  )

  if (!oneSided) return 'unverified'

  const threshold = Number(oneSided[2])
  if (!Number.isFinite(threshold)) return 'unverified'

  if (oneSided[1] === '<' || oneSided[1] === '<=' || oneSided[1] === '≤') {
    return number <= threshold ? 'normal' : 'high'
  }

  return number >= threshold ? 'normal' : 'low'
}

function getStatus(
  candidate: Candidate,
  value: string,
  unit: string,
  range: string,
): ResultStatus {
  const explicitStatus = normalizeStatus(candidate.status)
  if (explicitStatus) return explicitStatus

  for (const key of ['flag', 'result_flag', 'reference_flag']) {
    const flagStatus = normalizeStatus(candidate[key])
    if (flagStatus) return flagStatus
  }

  return classifyAgainstRange(value, unit, range)
}

function cleanExplanationText(value: string): string {
  return value
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`/g, '')
    .trim()
}

function parseExplanation(
  markdown: unknown,
): { summary?: string; tests: TestExplanation[] } {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return { tests: [] }
  }

  const intro = markdown.match(
    /^###\s+(?:\d+\.\s*)?(?:Introduction|Summary)\s*([\s\S]*?)(?=\n---|\n###\s|$)/im,
  )?.[1]

  const testResultsSection = markdown.match(
    /^###\s+(?:\d+\.\s*)?Test Results(?:\s+Breakdown)?\s*([\s\S]*?)(?=\n---|\n###\s|$)/im,
  )?.[1]

  const testHeadings = testResultsSection
    ? [
        ...testResultsSection.matchAll(
          /^\*\s+\*\*(?!Value:|Reference Range:|Comparison:|What it measures:)(.+?)\*\*\s*$/gm,
        ),
      ]
    : []

  const tests: TestExplanation[] = testHeadings.map((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length
    const end =
      testHeadings[index + 1]?.index ?? testResultsSection?.length ?? 0
    const section = testResultsSection?.slice(start, end) ?? ''

    const measures = section.match(
      /^\s*\*\s+\*\*What it measures:\*\*\s*(.+)$/im,
    )?.[1]

    const meaning = section.match(
      /^\s*\*\s+\*\*(?:Comparison|Result Analysis|Your result|Result Meaning):\*\*\s*(.+)$/im,
    )?.[1]

    return {
      name: heading[1].trim(),
      measures: measures ? cleanExplanationText(measures) : '',
      meaning: meaning ? cleanExplanationText(meaning) : '',
    }
  })

  // Support the older numbered-heading explanation format too.
  if (tests.length === 0) {
    const headings = [...markdown.matchAll(/^####\s+\d+\.\s+(.+)$/gm)]

    tests.push(
      ...headings.map((heading, index) => {
        const start = (heading.index ?? 0) + heading[0].length
        const end = headings[index + 1]?.index ?? markdown.length
        const section = markdown.slice(start, end)

        const measures = section.match(
          /^\s*[-*]\s+\*\*What it measures:\*\*\s*(.+)$/im,
        )?.[1]

        const meaning = section.match(
          /^\s*[-*]\s+\*\*(?:Comparison|Result Analysis|Your result|Result Meaning):\*\*\s*(.+)$/im,
        )?.[1]

        return {
          name: heading[1].trim(),
          measures: measures ? cleanExplanationText(measures) : '',
          meaning: meaning ? cleanExplanationText(meaning) : '',
        }
      }),
    )
  }

  return {
    summary: intro ? cleanExplanationText(intro) : undefined,
    tests,
  }
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/white\s*blood\s*cell(?:\s*count)?s?/g, 'wbc')
    .replace(/whitebloodcell(?:count)?s?/g, 'wbc')
    .replace(/[^a-z0-9]/g, '')
}

function getStructuredExplanations(value: unknown): TestExplanation[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      name: asText(item.test_name) ?? asText(item.name) ?? '',
      measures: asText(item.measures) ?? '',
      meaning:
        asText(item.meaning) ??
        asText(item.result_analysis) ??
        asText(item.analysis) ??
        '',
    }))
    .filter((item) => item.name && (item.measures || item.meaning))
}


function safeSources(
  value: unknown,
): { name: string; organization: string; url: string }[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []

    const source = item as Record<string, unknown>
    const name = asText(source.name)
    const organization = asText(source.organization)
    const url = asText(source.url)

    if (!name || !organization || !url || !url.startsWith('https://')) {
      return []
    }

    return [{ name, organization, url }]
  })
}

function getCategory(name: string): (typeof categories)[number] {
  const test = name.toLowerCase()

  if (/hemoglobin|hematocrit|platelet|white blood|red blood|wbc|rbc|cbc/.test(test)) {
    return 'blood_count'
  }

  if (/glucose|a1c|hemoglobin a1c|diabetes/.test(test)) {
    return 'diabetes'
  }

  if (/cholesterol|triglyceride|hdl|ldl/.test(test)) {
    return 'lipid'
  }

  if (/tsh|thyroid|t3|t4/.test(test)) {
    return 'thyroid'
  }

  if (/alt|ast|bilirubin|liver|alp/.test(test)) {
    return 'liver'
  }

  if (/creatinine|bun|kidney|egfr/.test(test)) {
    return 'kidney'
  }

  if (/vitamin|b12|folate/.test(test)) {
    return 'vitamin'
  }

  if (/sodium|potassium|chloride|calcium|electrolyte|metabolic/.test(test)) {
    return 'metabolic'
  }

  return 'other'
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData().catch(() => null)
    const file = formData?.get('file')

    if (!(file instanceof File)) {
      return Response.json({ error: 'No file was uploaded.' }, { status: 400 })
    }

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      return Response.json({ error: 'Please upload a PDF file.' }, { status: 415 })
    }

    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: 'File must be 10 MB or smaller.' },
        { status: 413 },
      )
    }

    const backendForm = new FormData()
    backendForm.append('file', file, file.name)

    const response = await fetch(`${BACKEND_URL}/api/reports/analyze`, {
      method: 'POST',
      body: backendForm,
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    })

    const responseText = await response.text()

    let data: Record<string, any>
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error(
        '[analyze] Invalid backend response:',
        responseText.slice(0, 500),
      )

      return Response.json(
        { error: 'The backend returned an invalid response.' },
        { status: 502 },
      )
    }

    if (!response.ok) {
      const message =
        typeof data.detail === 'string'
          ? data.detail
          : typeof data.error === 'string'
            ? data.error
            : 'Analysis failed. Please try again.'

      return Response.json({ error: message }, { status: response.status })
    }

    const candidates: Candidate[] = Array.isArray(data.candidate_results)
      ? data.candidate_results
      : Array.isArray(data.results)
        ? data.results
        : []

    const parsedExplanation = parseExplanation(data.explanation)
    const structuredExplanations = getStructuredExplanations(
      data.test_explanations,
    )

    // Prefer structured backend explanations over parsing the Markdown.
    const availableExplanations =
      structuredExplanations.length > 0
        ? structuredExplanations
        : parsedExplanation.tests

    const results = candidates.map((candidate, index) => {
      const name =
        asText(candidate.test_name) ??
        asText(candidate.name) ??
        'Unidentified test'

      const value =
        candidate.value === null || candidate.value === undefined
          ? 'Not extracted'
          : String(candidate.value)

      const unit = asText(candidate.unit) ?? ''

      const referenceRange =
        asText(candidate.reference_range) ??
        asText(candidate.referenceRange) ??
        ''

      const status = getStatus(candidate, value, unit, referenceRange)

      const exactExplanation = availableExplanations.find(
        (item) => normalizeName(item.name) === normalizeName(name),
      )

      const alignedExplanation =
        exactExplanation ??
        (availableExplanations.length === candidates.length
          ? availableExplanations[index]
          : undefined)

      const hasUsableExplanation =
        alignedExplanation !== undefined &&
        (!alignedExplanation.measures.includes('An explanation was not returned') &&
          !alignedExplanation.measures.includes('test-specific explanation was not returned'))

      const explicitMeasures = asText(candidate.measures)

      const explicitMeaning =
        asText(candidate.meaning) ??
        asText(candidate.result_analysis)

      const measures =
        explicitMeasures ??
        (hasUsableExplanation ? asText(alignedExplanation.measures) : undefined) ??
        'A test-specific explanation was not returned. Check the original report and consult a qualified healthcare professional for interpretation.'

      const meaning =
        explicitMeaning ??
        (hasUsableExplanation ? asText(alignedExplanation.meaning) : undefined) ??
        (status === 'unverified'
          ? 'The result could not be compared with a usable reference range or explicit flag. Check the original report with a qualified healthcare professional.'
          : `Compared with the reference range printed on the report, this result is ${
              status === 'normal'
                ? 'within range'
                : status === 'high'
                  ? 'above range'
                  : 'below range'
            }. This comparison is educational and is not a diagnosis.`)

      return {
        name,
        value,
        unit,
        referenceRange,
        status,
        category: getCategory(name),
        measures,
        meaning,
      }
    })

    const counts = {
      normal: results.filter((result) => result.status === 'normal').length,
      high: results.filter((result) => result.status === 'high').length,
      low: results.filter((result) => result.status === 'low').length,
      unverified: results.filter((result) => result.status === 'unverified').length,
    }

    const backendSummary =
      asText(data.summary) ?? parsedExplanation.summary

    const countSummary =
      `Of ${results.length} extracted result(s), ${counts.normal} are within the printed range, ${counts.high} are high, ${counts.low} are low, and ${counts.unverified} remain unverified.`

    const limitations = Array.isArray(data.limitations)
      ? data.limitations
      : typeof data.limitations === 'string' && data.limitations.trim()
        ? [data.limitations.trim()]
        : []

    return Response.json({
      isLabReport: results.length > 0,
      reportDate: asText(data.report_date) ?? asText(data.reportDate) ?? null,
      summary: [
        backendSummary,
        countSummary,
        'Confirm the extracted values against the original report. This is educational information, not a diagnosis.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      results,
      explanation_status: data.explanation_status ?? 'not_generated',
      disclaimer: data.disclaimer ?? '',
      limitations,
      sources: safeSources(data.sources),
    })
  } catch (error) {
    console.error('[analyze] Backend request failed:', error)

    return Response.json(
      { error: 'Could not connect to the backend or the request timed out.' },
      { status: 502 },
    )
  }
}
