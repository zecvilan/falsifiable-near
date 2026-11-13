import { Download } from 'lucide-react'
import { fmtDate } from '@/lib/format'
import { Section } from './primitives'

const DOWNLOADS = [
  { href: '/data/public.json', filename: 'falsifiable-near-public.json', label: 'Download snapshot JSON' },
  { href: '/thesis.md', filename: 'falsifiable-near-thesis.md', label: 'Download thesis.md' },
]

const SOURCE_LABELS: Record<string, { name: string; feeds: string }> = {
  nearblocks_charts: { name: 'NearBlocks charts API', feeds: 'Transactions, active/new accounts, price, total supply' },
  llama_chain_fees: { name: 'DefiLlama · NEAR chain fees', feeds: 'Daily gas fees (USD)' },
  llama_chain_burn: { name: 'DefiLlama · NEAR chain revenue', feeds: 'Burned share of gas fees (70%)' },
  llama_intents_volume: { name: 'DefiLlama · NEAR Intents volume', feeds: 'Daily swap input volume (USD)' },
  llama_intents_fees: { name: 'DefiLlama · NEAR Intents fees', feeds: 'Gross protocol + affiliate fees' },
  llama_intents_holders_revenue: { name: 'DefiLlama · NEAR Intents holders revenue', feeds: 'Captured revenue directed to buybacks' },
}

export function Methodology({
  sources,
  limitations,
  window,
  generatedAt,
}: {
  sources: Record<string, { url: string; status: string }>
  limitations: string[]
  window: { start: string; end: string; days: number }
  generatedAt: string
}) {
  return (
    <Section
      id="methodology"
      eyebrow="Methodology & reproducibility"
      title="Every number on this page comes from one command"
      lede={
        <p>
          Window: {fmtDate(window.start)} – {fmtDate(window.end)} ({window.days} days). Snapshot generated{' '}
          {new Date(generatedAt).toUTCString()}. No API keys, no hand-entered numbers, no sample data.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <h3 className="mb-3 font-medium">Re-run the analysis</h3>
            <pre className="max-w-full min-w-0 overflow-x-auto bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
              <code>{`git clone <this repo> && cd near-thesis
make data    # python3 scripts/fetch_public.py  (stdlib only)
make test    # unit tests for the statistics + aggregation
make dev     # dashboard at http://localhost:3000`}</code>
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              {DOWNLOADS.map((file) => (
                <a
                  key={file.href}
                  href={file.href}
                  download={file.filename}
                  className="inline-flex h-10 items-center gap-2 border border-foreground px-3.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <Download aria-hidden="true" className="size-4" />
                  {file.label}
                </a>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto panel">
            <table className="w-full text-sm">
              <caption className="px-4 py-3 text-left font-medium">Sources</caption>
              <thead className="label-mono !text-[10px]">
                <tr className="border-y">
                  <th scope="col" className="px-4 py-2 text-left font-normal">Endpoint</th>
                  <th scope="col" className="px-4 py-2 text-left font-normal">Feeds</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sources).map(([key, source]) => (
                  <tr key={key} className="border-b last:border-0 align-top">
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-4 hover:decoration-primary">
                        {SOURCE_LABELS[key]?.name ?? key}
                      </a>
                    </th>
                    <td className="px-4 py-2 text-muted-foreground">{SOURCE_LABELS[key]?.feeds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="mb-3 font-medium">Known limitations</h3>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            {limitations.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
