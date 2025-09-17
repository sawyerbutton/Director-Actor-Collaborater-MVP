import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Manage your projects'
}

export default function ProjectsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Projects</h1>
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <p className="text-lg mb-4">Your Projects</p>
          <p className="text-muted-foreground">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      </div>
    </div>
  )
}