import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const resetSchema = z.object({
  email: z.string().email()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = resetSchema.parse(body)
    
    console.log(`Password reset requested for: ${email}`)
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link will be sent.'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}