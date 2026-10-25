import type { LabReport, LabResult } from './lab-schema'

export type PrepQuestion = {
  id: string
  topic: string
  question: string
  priority: 'flagged' | 'general'
}

function questionsForFlagged(result: LabResult): string[] {
  const direction = result.status === 'high' ? 'higher' : 'lower'
  const valueText = `${result.value}${result.unit ? ` ${result.unit}` : ''}`
  const range = result.referenceRange ? ` (reference range ${result.referenceRange})` : ''
  return [
    `My ${result.name} was ${valueText}, which is ${direction} than the reference range${range}. What could be contributing to this in my case?`,
    `Should my ${result.name} be re-tested, and if so, when?`,
    `Are there lifestyle, diet, or medication factors that might affect my ${result.name}?`,
  ]
}

const categoryFollowUps: Partial<Record<LabResult['category'], string>> = {
  lipid: 'Given my cholesterol results, how would you assess my overall heart health risk?',
  diabetes: 'Do my blood sugar results suggest I need any additional screening or monitoring?',
  thyroid: 'Do my thyroid results explain any symptoms I may be experiencing, like fatigue or weight changes?',
  kidney: 'How are my kidneys functioning overall, and is there anything I should do to protect them?',
  liver: 'Could any of my medications or supplements be affecting my liver results?',
  blood_count: 'Do my blood count results suggest I should look into iron, B12, or other nutrient levels?',
  vitamin: 'Would you recommend a supplement, and if so, what dose and for how long?',
}

export function generateAppointmentQuestions(report: LabReport): PrepQuestion[] {
  const flagged = report.results.filter((r) => r.status !== 'normal')
  const questions: PrepQuestion[] = []

  for (const result of flagged) {
    questionsForFlagged(result).forEach((question, i) => {
      questions.push({
        id: `${result.id}-${i}`,
        topic: result.name,
        question,
        priority: 'flagged',
      })
    })
  }

  const flaggedCategories = new Set(flagged.map((r) => r.category))
  for (const category of flaggedCategories) {
    const followUp = categoryFollowUps[category]
    if (followUp) {
      questions.push({ id: `cat-${category}`, topic: 'Follow-up', question: followUp, priority: 'flagged' })
    }
  }

  const general = [
    flagged.length === 0
      ? 'All my results were within reference ranges. Is there anything you would still like to monitor?'
      : `${flagged.length} of my ${report.results.length} results were outside the reference range. Which of these matter most for me?`,
    'How do these results compare to my previous lab work?',
    'Are any of these results affected by fasting, timing, or medications I was taking?',
    'When should I schedule my next lab tests?',
  ]
  general.forEach((question, i) =>
    questions.push({ id: `general-${i}`, topic: 'General', question, priority: 'general' }),
  )

  return questions
}
