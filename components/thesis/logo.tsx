import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7', className)}>
      <rect width="32" height="32" className="fill-primary" />
      <polyline
        points="8.5,23.5 8.5,9.5 16,20 23.5,8.5"
        fill="none"
        strokeWidth="3.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className="stroke-primary-foreground"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-base font-medium tracking-tight">Falsifiable NEAR</span>
    </span>
  )
}
