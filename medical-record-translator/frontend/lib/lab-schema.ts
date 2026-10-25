import { z } from 'zod'

export const testCategories = [
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

export const sourceSchema = z.object({
  name: z.string(),
  organization: z.string(),
  url: z.string(),
})

export const labResultSchema = z.object({
  name: z.string().describe('Test name as printed on the report, e.g. "Hemoglobin"'),
  value: z.string().describe('Reported value exactly as printed, e.g. "13.2" or "<0.5"'),
  unit: z.string().describe('Unit of measure, e.g. "g/dL". Empty string if none.'),
  referenceRange: z
    .string()
    .describe('Reference range as printed, e.g. "12.0 - 15.5". Empty string if not shown.'),
  status: z
    .enum(['normal', 'high', 'low'])
    .describe('Flag based on the reference range or flag printed on the report'),
  category: z.enum(testCategories),
  measures: z
    .string()
    .describe('One or two plain-language sentences explaining what this test measures'),
  meaning: z
    .string()
    .describe(
      'One or two neutral, educational sentences on what a result in this range can commonly be associated with. Never diagnose.',
    ),
})

export const labAnalysisSchema = z.object({
  isLabReport: z
    .boolean()
    .describe('False if the document is not a laboratory test report'),
  reportDate: z
    .string()
    .nullable()
    .describe('Collection or report date in YYYY-MM-DD format, or null if not found'),
  summary: z
    .string()
    .describe(
      'A calm, 2-4 sentence plain-language overview of the report highlighting how many results are in or out of range. Educational only, no diagnosis.',
    ),
  results: z.array(labResultSchema),
  sources: z.array(sourceSchema).optional(),
})

export type LabResultInput = z.infer<typeof labResultSchema>
export type LabAnalysis = z.infer<typeof labAnalysisSchema>
export type TestCategory = (typeof testCategories)[number]
export type ResultStatus = LabResultInput['status']

export type LabResult = LabResultInput & { id: string }

export type LabReport = {
  id: string
  fileName: string
  reportDate: string
  analyzedAt: string
  summary: string
  results: LabResult[]
  sources?: z.infer<typeof sourceSchema>[]
}
