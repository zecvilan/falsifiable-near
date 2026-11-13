'use client'

import { useEffect, useRef, useState } from 'react'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

const NAV = [
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'track-record', label: 'Track record' },
  { id: 'demand', label: 'Demand' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'value-accrual', label: 'Value' },
  { id: 'lead-lag', label: 'Signal' },
  { id: 'model', label: 'Model' },
  { id: 'raw-chain', label: 'Raw chain' },
  { id: 'methodology', label: 'Method' },
]

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        setActive(ids.find((id) => visible.has(id)) ?? null)
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: 0 },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return active
}

const IDS = NAV.map((item) => item.id)

export function SiteHeader({ asOf }: { asOf: string }) {
  const active = useActiveSection(IDS)
  const scroller = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const container = scroller.current
    const link = container?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!container || !link) return
    const target = link.offsetLeft - (container.clientWidth - link.offsetWidth) / 2
    container.scrollTo({ left: target, behavior: 'smooth' })
  }, [active])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <a
          href="#top"
          aria-label="Falsifiable NEAR, back to top"
          className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          <Logo />
        </a>
        <nav aria-label="Sections" className="hidden min-w-0 xl:block">
          <ul className="flex items-center">
            {NAV.map((item) => (
              <li key={item.id}>
                <NavLink id={item.id} label={item.label} active={active === item.id} />
              </li>
            ))}
          </ul>
        </nav>
        <p className="hidden shrink-0 items-center gap-2.5 font-mono text-xs text-muted-foreground sm:flex">
          <span aria-hidden="true" className="size-2 bg-primary" />
          <span>
            Data as of{' '}
            <time dateTime={asOf} className="text-foreground">
              {fmtDate(asOf)}
            </time>
          </span>
        </p>
      </div>
      <nav aria-label="Sections" className="border-t border-border xl:hidden">
        <ul
          ref={scroller}
          className="mx-auto flex max-w-7xl overflow-x-auto px-1.5 [-ms-overflow-style:none] [scrollbar-width:none] md:px-5 [&::-webkit-scrollbar]:hidden"
        >
          {NAV.map((item) => (
            <li key={item.id} className="shrink-0">
              <NavLink id={item.id} label={item.label} active={active === item.id} />
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

function NavLink({ id, label, active }: { id: string; label: string; active: boolean }) {
  return (
    <a
      href={`#${id}`}
      aria-current={active ? 'location' : undefined}
      className={cn(
        'relative block whitespace-nowrap px-2.5 py-3 font-mono text-xs uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground xl:py-5',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-2.5 -bottom-px h-0.5 bg-primary transition-opacity', active ? 'opacity-100' : 'opacity-0')}
      />
    </a>
  )
}
