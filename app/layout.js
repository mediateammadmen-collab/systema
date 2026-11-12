import { Hind_Siliguri, Plus_Jakarta_Sans } from 'next/font/google'
import Header from '@/components/Header'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

// Ad copy may be in Bengali
const hind = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hind',
  display: 'swap',
})

export const metadata = {
  title: 'Systema Bangladesh · Meta Ads Performance',
  description: 'Meta Ads performance dashboard for Systema Bangladesh.',
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#060b16' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${hind.variable}`}>
      <body className="min-h-dvh antialiased">
        <div className="app-glow" aria-hidden="true" />
        <Header />
        {children}
      </body>
    </html>
  )
}
