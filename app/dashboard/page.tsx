import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your dashboard'
}

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <p data-testid="welcome-message" className="text-lg">
            Welcome back, {session.user?.email}!
          </p>
          <p className="mt-4 text-muted-foreground">
            This is your dashboard where you can manage your projects and scripts.
          </p>
        </div>
      </div>
    </div>
  )
}