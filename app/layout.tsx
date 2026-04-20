import type { Metadata } from 'next'
import { Geist, Fraunces } from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
})

export const metadata: Metadata = {
  title: 'Petty — Vet visit prep for pet owners',
  description: 'Log symptoms, track patterns, and walk into your vet visit prepared.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  )
}
