const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function fmtUsd(value: number | null | undefined) {
  return value == null ? '—' : compactUsd.format(value)
}

export function fmtNum(value: number | null | undefined) {
  return value == null ? '—' : compact.format(value)
}

export function fmtPct(value: number | null | undefined, digits = 1) {
  return value == null ? '—' : `${(value * 100).toFixed(digits)}%`
}

export function fmtRatio(value: number | null | undefined, digits = 2) {
  return value == null ? '—' : `${value.toFixed(digits)}×`
}

export function fmtChange(ratio: number | null | undefined) {
  if (ratio == null) return '—'
  const change = (ratio - 1) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`
}

export function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function fmtMonth(iso: string) {
  const [year, month] = iso.split('-')
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}
