import { Download } from 'lucide-react'
import { Logo } from './logo'

const DOWNLOADS = [
  { href: '/thesis.md', filename: 'falsifiable-near-thesis.md', label: 'thesis.md' },
  { href: '/data/public.json', filename: 'falsifiable-near-public.json', label: 'public.json' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="max-w-md text-balance text-2xl font-medium leading-tight tracking-[-0.03em]">
              Judged on the evidence, <span className="marker">not the conviction.</span>
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {DOWNLOADS.map((file) => (
              <li key={file.href}>
                <a
                  href={file.href}
                  download={file.filename}
                  className="inline-flex h-10 items-center gap-2 border border-foreground px-3.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <Download aria-hidden="true" className="size-4" />
                  <span className="sr-only">Download </span>
                  {file.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#methodology"
                className="inline-flex h-10 items-center px-3.5 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Methodology
              </a>
            </li>
          </ul>
        </div>
        <div className="label-mono flex flex-col gap-2 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <p>
            Falsifiable NEAR · Not investment advice · Built for <span className="text-foreground">NEAR Hackathon 2026</span>
          </p>
          <p>Data: NearBlocks · DefiLlama · BigQuery public NEAR dataset (optional)</p>
        </div>
      </div>
    </footer>
  )
}
