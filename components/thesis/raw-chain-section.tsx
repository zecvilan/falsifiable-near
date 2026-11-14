import type { ThesisData } from '@/lib/data'
import { fmtDate, fmtNum } from '@/lib/format'
import { Section, Stat } from './primitives'

export function RawChainSection({ bigquery }: { bigquery: ThesisData['bigquery'] }) {
  const hasData = bigquery.status === 'ok' && bigquery.onchain.length > 0
  const recent = bigquery.onchain.slice(-90)
  const crosscheck = bigquery.crosscheck
  const allExact = !!crosscheck && crosscheck.summary.weeks > 0 && crosscheck.summary.exact_weeks === crosscheck.summary.weeks
  const avg = (key: 'active_signers' | 'transactions') =>
    recent.length ? recent.reduce((sum, row) => sum + row[key], 0) / recent.length : null

  return (
    <Section
      id="raw-chain"
      eyebrow="Deep dive · raw chain data"
      title="Cross-check against the BigQuery public NEAR dataset"
      lede={
        <p>
          Aggregators can be wrong. The second pipeline queries raw transactions and receipts from{' '}
          <code className="font-mono text-foreground">bigquery-public-data.crypto_near_mainnet_us</code> using
          versioned SQL, so anyone can audit signer counts and contract usage without relying on NearBlocks.
        </p>
      }
    >
      {hasData ? (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Active signers / day, last 90d" value={fmtNum(avg('active_signers'))} />
            <Stat label="Transactions / day, last 90d" value={fmtNum(avg('transactions'))} />
            <Stat label="Window" value={`${bigquery.window?.days ?? 0}d`} detail={bigquery.window ? `${fmtDate(bigquery.window.start)} – ${fmtDate(bigquery.window.end)}` : undefined} />
            {allExact && crosscheck ? (
              <Stat
                label="Matches NearBlocks exactly"
                value={`${crosscheck.summary.exact_weeks}/${crosscheck.summary.weeks}`}
                detail="Weeks where signers and txns equal NearBlocks"
              />
            ) : crosscheck?.summary.signers_ratio != null ? (
              <Stat
                label="BigQuery ÷ NearBlocks, signers"
                value={`${crosscheck.summary.signers_ratio.toFixed(2)}×`}
                detail={`Over ${crosscheck.summary.weeks} comparable weeks`}
              />
            ) : (
              <Stat label="Contracts ranked" value={fmtNum(bigquery.topContracts.length)} detail="From the top 25 stored per day; totals are lower bounds" />
            )}
          </dl>
          {allExact ? (
            <p className="max-w-3xl text-pretty leading-relaxed">
              Raw-chain counts reproduce the NearBlocks figures behind T3 to the unit in every comparable week, so the
              base-layer numbers above are not an aggregator artifact. This confirms NearBlocks; it is not a second,
              differently-defined measurement.
            </p>
          ) : crosscheck && crosscheck.weekly.length > 0 ? (
            <div className="overflow-x-auto panel">
              <table className="w-full text-sm">
                <caption className="px-4 py-3 text-left text-sm font-medium">
                  Weekly averages per day: raw chain (BigQuery) vs aggregator (NearBlocks)
                </caption>
                <thead className="label-mono !text-[10px]">
                  <tr className="border-y">
                    <th scope="col" className="px-4 py-2 text-left font-normal">Week of</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">BigQuery signers</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">NearBlocks active</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">BigQuery txns</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">NearBlocks txns</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {crosscheck.weekly.map((row) => (
                    <tr key={row.period} className="border-b last:border-0">
                      <th scope="row" className="px-4 py-2 text-left font-normal">
                        {fmtDate(row.period)}
                        {row.days < 7 ? <span className="text-muted-foreground">{` (${row.days}d)`}</span> : null}
                      </th>
                      <td className="px-4 py-2 text-right">{fmtNum(row.bigquery_signers_avg)}</td>
                      <td className="px-4 py-2 text-right">{fmtNum(row.nearblocks_active_avg)}</td>
                      <td className="px-4 py-2 text-right">{fmtNum(row.bigquery_txns_avg)}</td>
                      <td className="px-4 py-2 text-right">{fmtNum(row.nearblocks_txns_avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {bigquery.topContracts.length > 0 ? (
          <div className="overflow-x-auto panel">
            <table className="w-full text-sm">
              <caption className="px-4 py-3 text-left text-sm font-medium">Top contracts by function-call receipts</caption>
              <thead className="label-mono !text-[10px]">
                <tr className="border-y">
                  <th scope="col" className="px-4 py-2 text-left font-normal">Contract</th>
                  <th scope="col" className="px-4 py-2 text-right font-normal">Receipts</th>
                  <th scope="col" className="px-4 py-2 text-right font-normal">Originating txns</th>
                  <th scope="col" className="px-4 py-2 text-right font-normal">Signer-days</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {bigquery.topContracts.map((row) => (
                  <tr key={row.contract} className="border-b last:border-0">
                    <th scope="row" className="max-w-xs truncate px-4 py-2 text-left font-normal">{row.contract}</th>
                    <td className="px-4 py-2 text-right">{fmtNum(row.receipts)}</td>
                    <td className="px-4 py-2 text-right">{fmtNum(row.transactions)}</td>
                    <td className="px-4 py-2 text-right">{fmtNum(row.signerDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {bigquery.mode === 'export' ? 'Imported from BigQuery console exports of ' : 'Queried with '}
            <a
              className="font-mono text-foreground underline underline-offset-4"
              href="https://github.com/zecvilan/falsifiable-near/blob/main/sql/daily_usage.sql"
            >
              sql/daily_usage.sql
            </a>
            {' and '}
            <a
              className="font-mono text-foreground underline underline-offset-4"
              href="https://github.com/zecvilan/falsifiable-near/blob/main/sql/contract_usage.sql"
            >
              sql/contract_usage.sql
            </a>
            {'. Raw exports are committed under '}
            <code className="font-mono text-foreground">data/bigquery/</code>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 panel border-dashed p-6 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-xl flex-col gap-2">
            <p className="font-medium">Not yet run in this snapshot</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              BigQuery bills query processing, so this pipeline runs under your own Google Cloud access: a billed
              project, or a console export from the free sandbox. Until it runs, this panel stays empty. No sample data is shown in its place. The headline tests above do
              not depend on it.
            </p>
          </div>
          <pre className="max-w-full min-w-0 overflow-x-auto bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
            <code>{`# Option A: query directly (billed project)
cp .env.example .env   # set GOOGLE_CLOUD_PROJECT
gcloud auth application-default login
pip install -r requirements.txt
make dry-run           # estimate bytes first
make rebuild           # writes data/dashboard.json

# Option B: BigQuery console export
# run sql/daily_usage.sql, save JSON to
# data/bigquery/daily_usage.raw.json, then
make bq-import         # + NearBlocks cross-check`}</code>
          </pre>
        </div>
      )}
    </Section>
  )
}
