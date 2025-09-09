import { Metadata } from 'next'
import Link from 'next/link'
import { PasswordResetForm } from '@/components/auth/password-reset-form'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your account password'
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email address and we'll send you a reset link
          </p>
        </div>
        <PasswordResetForm />
        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}