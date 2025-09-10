import { Metadata } from 'next'
import Link from 'next/link'
import { SimpleLoginForm } from '@/components/auth/simple-login-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your account'
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              create a new account
            </Link>
          </p>
        </div>
        <SimpleLoginForm />
        <div className="text-center">
          <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  )
}