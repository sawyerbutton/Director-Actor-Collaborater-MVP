// TODO: EVALUATE FOR PRODUCTION - Server action approach to bypass CSRF issues
// This was created as a workaround for NextAuth v5 CSRF token issues in production mode
// Consider whether to keep this approach or fix client-side CSRF handling

'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard'
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.'
        default:
          return 'Something went wrong.'
      }
    }
    throw error
  }
}