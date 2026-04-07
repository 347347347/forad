import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '検証ダッシュボード',
  description: 'AD業務支援ツール',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
