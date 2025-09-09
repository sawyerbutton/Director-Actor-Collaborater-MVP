import { NextRequest } from 'next/server';
import { z } from 'zod';
import { userService } from '@/lib/db/services/user.service';
import { ApiResponse } from '@/lib/api/response';
import { ValidationError, BusinessError } from '@/lib/api/errors';
import { registrationRateLimiter } from '@/lib/api/middleware/rate-limit';
import { passwordSchema, isWeakPassword } from '@/lib/api/validators/password';
import { auditLog, AuthEvent } from '@/lib/api/security/audit-log';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional()
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await registrationRateLimiter(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const body = await request.json();
    
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Invalid registration data', validation.error.flatten().fieldErrors);
    }
    
    const { email, password, name } = validation.data;
    
    // Check for weak passwords
    if (isWeakPassword(password)) {
      throw new ValidationError('Password is too common or weak. Please choose a stronger password.');
    }
    
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      throw new BusinessError('Email already registered');
    }
    
    const user = await userService.create({
      email,
      password,
      name: name || null,
    });
    
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    
    // Log successful registration
    const { ip, userAgent } = auditLog.extractRequestInfo(request as any);
    await auditLog.logAuthEvent({
      event: AuthEvent.REGISTRATION_SUCCESS,
      userId: user.id,
      email: user.email,
      ip,
      userAgent
    });
    
    return ApiResponse.success(userResponse, 'User registered successfully', 201);
  } catch (error) {
    // Log failed registration
    const { ip, userAgent } = auditLog.extractRequestInfo(request as any);
    await auditLog.logAuthEvent({
      event: AuthEvent.REGISTRATION_FAILED,
      email: (error as any).email || 'unknown',
      ip,
      userAgent,
      metadata: { error: (error as Error).message }
    });
    
    return ApiResponse.error(error);
  }
}