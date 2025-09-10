'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { authenticate } from '@/app/auth/login/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

function LoginButton() {
  const { pending } = useFormStatus()
  
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  )
}

export function SimpleLoginForm() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined)

  return (
    <form action={dispatch} className="space-y-6">
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          data-testid="login-email"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="login-password"
          className="mt-1"
        />
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription data-testid="login-error">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <LoginButton />
    </form>
  )
}