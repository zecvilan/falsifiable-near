export const AXIS_TICK = { fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--muted-foreground)' }

export const GRID_PROPS = {
  vertical: false,
  stroke: 'var(--border)',
  strokeDasharray: '2 4',
} as const

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tick: AXIS_TICK,
  tickMargin: 8,
} as const

export function annotationLabel(color: string, position: 'top' | 'right' | 'left' | 'bottom' = 'top') {
  return {
    position,
    fill: color,
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
  } as const
}
