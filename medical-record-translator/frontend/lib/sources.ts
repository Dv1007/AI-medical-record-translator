import type { LabReport, TestCategory } from './lab-schema'

export type Source = {
  name: string
  organization: string
  url: string
}

const generalSources: Source[] = [
  {
    name: 'Understanding Laboratory Tests',
    organization: 'MedlinePlus — U.S. National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/',
  },
  {
    name: 'How to Understand Your Lab Results',
    organization: 'MedlinePlus — U.S. National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/',
  },
]

const categorySources: Record<TestCategory, Source[]> = {
  blood_count: [
    {
      name: 'Complete Blood Count (CBC)',
      organization: 'MedlinePlus — U.S. National Library of Medicine (NIH)',
      url: 'https://medlineplus.gov/lab-tests/complete-blood-count-cbc/',
    },
    {
      name: 'Anemia',
      organization: 'National Heart, Lung, and Blood Institute (NIH)',
      url: 'https://www.nhlbi.nih.gov/health/anemia',
    },
  ],
  metabolic: [
    {
      name: 'Comprehensive Metabolic Panel (CMP)',
      organization: 'MedlinePlus — U.S. National Library of Medicine (NIH)',
      url: 'https://medlineplus.gov/lab-tests/comprehensive-metabolic-panel-cmp/',
    },
  ],
  lipid: [
    {
      name: 'Cholesterol',
      organization: 'American Heart Association',
      url: 'https://www.heart.org/en/health-topics/cholesterol',
    },
    {
      name: 'Cholesterol Levels',
      organization: 'MedlinePlus — U.S. National Library of Medicine (NIH)',
      url: 'https://medlineplus.gov/lab-tests/cholesterol-levels/',
    },
  ],
  diabetes: [
    {
      name: 'Understanding A1C',
      organization: 'American Diabetes Association',
      url: 'https://diabetes.org/about-diabetes/a1c',
    },
    {
      name: 'Diabetes Testing',
      organization: 'Centers for Disease Control and Prevention (CDC)',
      url: 'https://www.cdc.gov/diabetes/diabetes-testing/index.html',
    },
  ],
  thyroid: [
    {
      name: 'Thyroid Function Tests',
      organization: 'American Thyroid Association',
      url: 'https://www.thyroid.org/thyroid-function-tests/',
    },
  ],
  liver: [
    {
      name: 'Liver Function Tests',
      organization: 'MedlinePlus — U.S. National Library of Medicine (NIH)',
      url: 'https://medlineplus.gov/lab-tests/liver-function-tests/',
    },
  ],
  kidney: [
    {
      name: 'Kidney Disease',
      organization: 'National Institute of Diabetes and Digestive and Kidney Diseases (NIH)',
      url: 'https://www.niddk.nih.gov/health-information/kidney-disease',
    },
  ],
  vitamin: [
    {
      name: 'Dietary Supplement Fact Sheets',
      organization: 'Office of Dietary Supplements (NIH)',
      url: 'https://ods.od.nih.gov/factsheets/list-all/',
    },
  ],
  other: [],
}

export function getSourcesForReport(report: LabReport): Source[] {
  const categories = Array.from(new Set(report.results.map((r) => r.category)))
  const seen = new Set<string>()
  return [...generalSources, ...categories.flatMap((c) => categorySources[c])].filter((s) => {
    if (seen.has(s.url)) return false
    seen.add(s.url)
    return true
  })
}
