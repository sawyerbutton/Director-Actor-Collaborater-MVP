import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your dashboard'
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <p data-testid="welcome-message" className="text-lg">
            Welcome to your Dashboard!
          </p>
          <p className="mt-4 text-muted-foreground">
            This is your dashboard where you can manage your projects and scripts.
          </p>
        </div>
      </div>
    </div>
  )
}