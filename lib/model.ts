export interface ScenarioInputs {
  volumeGrowth: number
  takeRateBps: number
  issuanceRate: number
  burnGrowth: number
}

export interface ScenarioBaseline {
  price_usd: number
  total_supply_near: number
  intents_volume_usd_annual: number
  burn_usd_annual: number
}

export interface ScenarioYear {
  year: number
  volume: number
  holderValue: number
  burn: number
  issuanceValue: number
  coverage: number
}

export const HORIZON_YEARS = 5

/**
 * Holder-value coverage of dilution, at a constant NEAR price.
 * coverage_y = (volume_y × take rate + burn_y) / (supply_{y-1} × issuance rate × price)
 */
export function projectScenario(base: ScenarioBaseline, inputs: ScenarioInputs): ScenarioYear[] {
  const take = inputs.takeRateBps / 10_000
  const years: ScenarioYear[] = []
  let supply = base.total_supply_near
  for (let year = 0; year <= HORIZON_YEARS; year++) {
    const volume = base.intents_volume_usd_annual * (1 + inputs.volumeGrowth) ** year
    const burn = base.burn_usd_annual * (1 + inputs.burnGrowth) ** year
    const holderValue = volume * take
    const issuanceValue = supply * inputs.issuanceRate * base.price_usd
    years.push({
      year,
      volume,
      holderValue,
      burn,
      issuanceValue,
      coverage: issuanceValue > 0 ? (holderValue + burn) / issuanceValue : Number.POSITIVE_INFINITY,
    })
    supply *= 1 + inputs.issuanceRate
  }
  return years
}

/** Annual Intents volume growth needed for coverage to reach 1.0× by the horizon year (bisection). */
export function breakEvenGrowth(base: ScenarioBaseline, inputs: ScenarioInputs): number | null {
  const coverageAt = (growth: number) => projectScenario(base, { ...inputs, volumeGrowth: growth })[HORIZON_YEARS].coverage
  if (coverageAt(-0.99) >= 1) return -0.99
  if (coverageAt(20) < 1) return null
  let low = -0.99
  let high = 20
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2
    if (coverageAt(mid) >= 1) high = mid
    else low = mid
  }
  return high
}
