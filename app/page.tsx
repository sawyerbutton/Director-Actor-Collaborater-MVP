import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold">Director-Actor-Collaborater MVP</h1>

        <div className="space-y-4">
          <p className="text-xl">
            Welcome to the Director-Actor Collaborator System
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
      </div>
    </div>
  )
}