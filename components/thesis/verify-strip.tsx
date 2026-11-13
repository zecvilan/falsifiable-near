import { ArrowDown, ArrowUpRight, Download } from 'lucide-react'
import type { Preregistration } from '@/lib/data'

const FILES = [
  {
    name: 'thesis.md',
    kind: 'Markdown',
    hint: 'The full written thesis: the claim, the six tests and what would falsify each one.',
    href: '/thesis.md',
    filename: 'falsifiable-near-thesis.md',
  },
  {
    name: 'public.json',
    kind: 'JSON',
    hint: 'The raw snapshot behind every number, chart and verdict on this page.',
    href: '/data/public.json',
    filename: 'falsifiable-near-public.json',
  },
]

const ACTION =
  'inline-flex h-10 items-center gap-2 px-3.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'

export function VerifyStrip({ preregistration }: { preregistration: Preregistration }) {
  return (
    <aside id="verify" aria-labelledby="verify-title" className="scroll-mt-32 border border-foreground xl:scroll-mt-20">
      <div className="grid gap-px bg-foreground lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-8 bg-foreground p-5 text-background md:p-6">
          <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-background/70">
            <span aria-hidden="true" className="size-2 bg-primary" />
            Verify it yourself
          </p>
          <div className="flex flex-col gap-3">
            <h2 id="verify-title" className="text-balance text-2xl font-medium leading-tight tracking-[-0.03em] md:text-3xl">
              Don&apos;t trust the page. Download the evidence.
            </h2>
            <p className="break-all font-mono text-[11px] leading-relaxed text-background/70">
              {preregistration.thresholds_tag} · sha256:{preregistration.thresholds_sha256.slice(0, 16)}…
            </p>
          </div>
        </div>

        {FILES.map((file) => (
          <div key={file.href} className="flex flex-col justify-between gap-8 bg-card p-5 md:p-6">
            <div className="flex flex-col gap-3">
              <p className="label-mono">{file.kind}</p>
              <h3 className="font-mono text-lg font-medium tracking-tight">{file.name}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{file.hint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={file.href}
                download={file.filename}
                className={`${ACTION} bg-primary text-primary-foreground hover:bg-foreground hover:text-background`}
              >
                <Download aria-hidden="true" className="size-4" />
                Download<span className="sr-only"> {file.name}</span>
              </a>
              <a
                href={file.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ACTION} border border-input hover:border-foreground`}
              >
                Open<span className="sr-only"> {file.name} in a new tab</span>
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </div>
          </div>
        ))}

        <div className="flex flex-col justify-between gap-8 bg-card p-5 md:p-6">
          <div className="flex flex-col gap-3">
            <p className="label-mono">Method</p>
            <h3 className="font-mono text-lg font-medium tracking-tight">make data</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              One command rebuilds the snapshot from public APIs. Sources, commands and known limitations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="#methodology" className={`${ACTION} border border-input hover:border-foreground`}>
              Re-run the method
              <ArrowDown aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  )
}
