import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chrono — Focus utilities',
  description: 'A minimal desktop timer, stopwatch, alarm, and session utility.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#0a0b0d',
  userScalable: false,
}

// Runs before paint so the saved theme applies immediately — without this,
// a light-mode user would see a flash of dark UI on every load.
const THEME_INIT_SCRIPT = `
try {
  var saved = window.localStorage.getItem('chrono:theme');
  var theme = saved ? JSON.parse(saved) : 'dark';
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
} catch (e) {}
`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <link rel="preload" href="/fonts/SquareSansSerif7-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Clocker-Medium.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
