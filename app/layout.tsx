import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/navbar'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ScriptAI - 智能剧本分析系统',
  description: '使用AI多智能体协作，在10秒内帮您发现并修复剧本中的逻辑错误',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.className}>
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}