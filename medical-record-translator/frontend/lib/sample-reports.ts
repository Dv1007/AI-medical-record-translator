import type { LabReport, LabResultInput } from './lab-schema'

function withIds(prefix: string, results: LabResultInput[]) {
  return results.map((r, i) => ({ ...r, id: `${prefix}-${i}` }))
}

const cbc: LabResultInput[] = [
  {
    name: 'Hemoglobin',
    value: '11.4',
    unit: 'g/dL',
    referenceRange: '12.0 - 15.5',
    status: 'low',
    category: 'blood_count',
    measures: 'Hemoglobin is the protein in red blood cells that carries oxygen from your lungs to the rest of your body.',
    meaning: 'A lower value can be associated with anemia, which has many possible causes such as low iron, blood loss, or nutrient deficiencies.',
  },
  {
    name: 'White Blood Cell Count',
    value: '6.8',
    unit: 'K/µL',
    referenceRange: '4.5 - 11.0',
    status: 'normal',
    category: 'blood_count',
    measures: 'White blood cells are part of your immune system and help your body fight infections.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'Platelet Count',
    value: '245',
    unit: 'K/µL',
    referenceRange: '150 - 400',
    status: 'normal',
    category: 'blood_count',
    measures: 'Platelets are small cell fragments that help your blood clot and stop bleeding.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'Ferritin',
    value: '9',
    unit: 'ng/mL',
    referenceRange: '15 - 150',
    status: 'low',
    category: 'vitamin',
    measures: 'Ferritin is a protein that stores iron, so it reflects how much iron your body has in reserve.',
    meaning: 'Lower ferritin is commonly associated with reduced iron stores.',
  },
  {
    name: 'Glucose, Fasting',
    value: '92',
    unit: 'mg/dL',
    referenceRange: '70 - 99',
    status: 'normal',
    category: 'diabetes',
    measures: 'Fasting glucose measures the amount of sugar in your blood after not eating for at least 8 hours.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'TSH',
    value: '2.1',
    unit: 'mIU/L',
    referenceRange: '0.4 - 4.0',
    status: 'normal',
    category: 'thyroid',
    measures: 'Thyroid-stimulating hormone (TSH) is made by the pituitary gland and tells your thyroid how much hormone to produce.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
]

const lipid: LabResultInput[] = [
  {
    name: 'Total Cholesterol',
    value: '232',
    unit: 'mg/dL',
    referenceRange: '< 200',
    status: 'high',
    category: 'lipid',
    measures: 'Total cholesterol is the overall amount of cholesterol, a waxy fat-like substance, in your blood.',
    meaning: 'Higher total cholesterol can be associated with increased cardiovascular risk, especially alongside other factors.',
  },
  {
    name: 'LDL Cholesterol',
    value: '151',
    unit: 'mg/dL',
    referenceRange: '< 100',
    status: 'high',
    category: 'lipid',
    measures: 'LDL is often called "bad" cholesterol because it can build up in the walls of blood vessels.',
    meaning: 'Higher LDL levels are commonly associated with plaque buildup in arteries over time.',
  },
  {
    name: 'HDL Cholesterol',
    value: '54',
    unit: 'mg/dL',
    referenceRange: '> 40',
    status: 'normal',
    category: 'lipid',
    measures: 'HDL is often called "good" cholesterol because it helps carry cholesterol away from your arteries.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'Triglycerides',
    value: '138',
    unit: 'mg/dL',
    referenceRange: '< 150',
    status: 'normal',
    category: 'lipid',
    measures: 'Triglycerides are a type of fat in your blood that your body uses for energy.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'Hemoglobin A1c',
    value: '5.9',
    unit: '%',
    referenceRange: '4.0 - 5.6',
    status: 'high',
    category: 'diabetes',
    measures: 'A1c reflects your average blood sugar level over roughly the past two to three months.',
    meaning: 'A value slightly above the range is often discussed in relation to prediabetes screening.',
  },
]

const metabolic: LabResultInput[] = [
  {
    name: 'Sodium',
    value: '140',
    unit: 'mmol/L',
    referenceRange: '135 - 145',
    status: 'normal',
    category: 'metabolic',
    measures: 'Sodium is an electrolyte that helps control fluid balance, nerve signals, and muscle function.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'Potassium',
    value: '4.2',
    unit: 'mmol/L',
    referenceRange: '3.5 - 5.1',
    status: 'normal',
    category: 'metabolic',
    measures: 'Potassium is an electrolyte important for heart rhythm and muscle function.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'Creatinine',
    value: '0.9',
    unit: 'mg/dL',
    referenceRange: '0.6 - 1.2',
    status: 'normal',
    category: 'kidney',
    measures: 'Creatinine is a waste product from muscle activity that is filtered out of the blood by the kidneys.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
  {
    name: 'ALT',
    value: '28',
    unit: 'U/L',
    referenceRange: '7 - 56',
    status: 'normal',
    category: 'liver',
    measures: 'ALT is an enzyme found mostly in the liver; it is used as a marker of liver health.',
    meaning: 'A value in this range is typically considered within expected limits.',
  },
]

export const sampleReports: LabReport[] = [
  {
    id: 'sample-cbc',
    fileName: 'annual_bloodwork_oct.pdf',
    reportDate: '2026-10-08',
    analyzedAt: '2026-10-09T14:12:00.000Z',
    summary:
      'This report includes 6 results. 4 are within their reference ranges, while Hemoglobin and Ferritin are below range. Together these are often reviewed in the context of iron levels — a good topic to discuss with your healthcare professional.',
    results: withIds('cbc', cbc),
  },
  {
    id: 'sample-lipid',
    fileName: 'lipid_panel_summer.pdf',
    reportDate: '2026-07-21',
    analyzedAt: '2026-07-22T09:40:00.000Z',
    summary:
      'This report includes 5 results. Total cholesterol, LDL cholesterol, and Hemoglobin A1c are above their reference ranges, while HDL and triglycerides are within range. These markers are commonly reviewed together when discussing heart and metabolic health.',
    results: withIds('lipid', lipid),
  },
  {
    id: 'sample-bmp',
    fileName: 'metabolic_panel_spring.pdf',
    reportDate: '2026-04-03',
    analyzedAt: '2026-04-03T17:05:00.000Z',
    summary:
      'All 4 results in this report are within their reference ranges, covering electrolytes, kidney function, and a liver enzyme.',
    results: withIds('bmp', metabolic),
  },
]

export const demoSampleReport: Omit<LabReport, 'id' | 'analyzedAt'> = {
  fileName: 'sample_lab_report.pdf',
  reportDate: '2026-10-20',
  summary:
    'This sample report includes 7 results. Hemoglobin and Ferritin are below range and LDL cholesterol is above range; the remaining results are within their reference ranges. These are useful starting points for a conversation with your healthcare professional.',
  results: withIds('demo', [cbc[0], cbc[1], cbc[3], lipid[1], lipid[2], metabolic[0], metabolic[2]]),
}
