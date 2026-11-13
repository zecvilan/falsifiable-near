import type { ThesisData } from '@/lib/data'
import { fmtDate, fmtNum } from '@/lib/format'
import { Section, Stat } from './primitives'

export function RawChainSection({ bigquery }: { bigquery: ThesisData['bigquery'] }) {
  const hasData = bigquery.status === 'ok' && bigquery.onchain.length > 0
  const recent = bigquery.onchain.slice(-90)
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
            <Stat label="Contracts ranked" value={fmtNum(bigquery.topContracts.length)} detail="From the top 25 stored per day; totals are lower bounds" />
          </dl>
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
        </div>
      ) : (
        <div className="flex flex-col gap-4 panel border-dashed p-6 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-xl flex-col gap-2">
            <p className="font-medium">Not yet run in this snapshot</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              BigQuery charges for query processing, so this pipeline only runs under your own Google Cloud project.
              Until it runs, this panel stays empty. No sample data is shown in its place. The headline tests above do
              not depend on it.
            </p>
          </div>
          <pre className="max-w-full min-w-0 overflow-x-auto bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
            <code>{`cp .env.example .env   # set GOOGLE_CLOUD_PROJECT
gcloud auth application-default login
pip install -r requirements.txt
make dry-run           # estimate bytes first
make rebuild           # writes data/dashboard.json`}</code>
          </pre>
        </div>
      )}
    </Section>
  )
}
