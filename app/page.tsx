import { getThesisData } from '@/lib/data'
import { SiteHeader } from '@/components/thesis/site-header'
import { Hero } from '@/components/thesis/hero'
import { VerifyStrip } from '@/components/thesis/verify-strip'
import { Scorecard } from '@/components/thesis/scorecard'
import { TrackRecord } from '@/components/thesis/track-record'
import { DemandSection } from '@/components/thesis/demand-section'
import { AdoptionSection } from '@/components/thesis/adoption-section'
import { ValueAccrualSection } from '@/components/thesis/value-accrual-section'
import { LeadLagSection } from '@/components/thesis/lead-lag-section'
import { ScenarioModel } from '@/components/thesis/scenario-model'
import { RawChainSection } from '@/components/thesis/raw-chain-section'
import { Methodology } from '@/components/thesis/methodology'
import { SiteFooter } from '@/components/thesis/site-footer'

export default function Page() {
  const data = getThesisData()
  const m = data.metrics

  return (
    <>
      <SiteHeader asOf={data.asOf} />
      <main className="flex w-full flex-col">
        <Hero data={data} />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-24 px-4 pb-24 pt-12 md:gap-32 md:px-8 md:pt-16">
          <VerifyStrip preregistration={data.preregistration} />
          <Scorecard tests={data.tests} preregistration={data.preregistration} sources={data.sources} />
          <TrackRecord history={data.history} tests={data.tests} preregistration={data.preregistration} />
          <DemandSection weekly={data.weekly} metrics={m} />
          <AdoptionSection weekly={data.weekly} metrics={m} />
          <ValueAccrualSection series={data.valueAccrual} metrics={m} />
          <LeadLagSection leadLag={data.leadLag} />
          <ScenarioModel baseline={data.model} coverageNow={m.value_accrual_coverage_90d} />
          <RawChainSection bigquery={data.bigquery} />
          <Methodology sources={data.sources} limitations={data.limitations} window={data.window} generatedAt={data.generatedAt} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
