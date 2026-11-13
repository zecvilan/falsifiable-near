import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Falsifiable NEAR — A NEAR thesis that can fail in public',
  applicationName: 'Falsifiable NEAR',
  description:
    'A falsifiable 3–5 year investment thesis for NEAR Protocol, scored against six tests with frozen thresholds using reproducible onchain data, live dashboards and an open scenario model.',
  generator: 'v0.app',
  keywords: ['NEAR Protocol', 'NEAR Intents', 'investment thesis', 'onchain analytics', 'chain abstraction'],
  openGraph: {
    title: 'Falsifiable NEAR',
    description: 'Judged on the evidence, not the conviction. Six tests with frozen thresholds, live data, re-runnable models.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Falsifiable NEAR',
    description: 'A NEAR thesis that can fail in public. Six tests, frozen thresholds, re-graded daily on public data.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f3f7f4',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="min-h-dvh antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
