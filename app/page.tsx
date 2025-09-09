import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const session = await auth()

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold">Director-Actor-Collaborater MVP</h1>
        
        {session ? (
          <div className="space-y-4">
            <p data-testid="welcome-message" className="text-xl">
              Welcome back, {session.user?.email}!
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
              <Link href="/projects">
                <Button size="lg" variant="outline">View Projects</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p data-testid="auth-message" className="text-lg text-muted-foreground">
              Please sign in to access your dashboard
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button size="lg">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline">Sign Up</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}