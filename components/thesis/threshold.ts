import type { ThesisTest } from '@/lib/data'

export interface ParsedThreshold {
  passAt: number | null
  failBelow: number | null
  passOperator: '≥' | '>'
}

// Presentation-only: reads the frozen numbers out of each test's `rule` string; it grades nothing.
export function parseThreshold(test: ThesisTest): ParsedThreshold {
  const passAt = test.rule.match(/pass ≥ ([\d.]+)/)?.[1]
  const failBelow = test.rule.match(/fail < ([\d.]+)/)?.[1]
  const critical = test.rule.match(/critical r \(([\d.]+)\)/)?.[1]
  return {
    passAt: passAt != null ? Number(passAt) : critical != null ? Number(critical) : null,
    failBelow: failBelow != null ? Number(failBelow) : null,
    passOperator: passAt != null ? '≥' : '>',
  }
}

export function formatTestNumber(value: number | null, unit: string) {
  if (value == null) return '—'
  return unit === 'x' ? `${value.toFixed(2)}×` : value.toFixed(3)
}
