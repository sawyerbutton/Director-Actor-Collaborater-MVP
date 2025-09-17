import { z } from 'zod';

// Password complexity requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

export function validatePasswordComplexity(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (!PASSWORD_REGEX.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!PASSWORD_REGEX.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!PASSWORD_REGEX.number.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!PASSWORD_REGEX.special.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Zod schema for password validation
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
  .refine(
    (password) => PASSWORD_REGEX.uppercase.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => PASSWORD_REGEX.lowercase.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => PASSWORD_REGEX.number.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => PASSWORD_REGEX.special.test(password),
    'Password must contain at least one special character'
  );

// Common weak passwords to check against
const COMMON_WEAK_PASSWORDS = [
  'password',
  '12345678',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome123',
  'password123',
  'admin@123'
];

export function isWeakPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  return COMMON_WEAK_PASSWORDS.some(weak => 
    lowerPassword.includes(weak) || weak.includes(lowerPassword)
  );
}

export function getPasswordStrength(password: string): {
  score: number; // 0-5
  label: string;
} {
  let score = 0;
  
  // Length bonus
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  
  // Complexity bonus
  if (PASSWORD_REGEX.uppercase.test(password)) score++;
  if (PASSWORD_REGEX.lowercase.test(password)) score++;
  if (PASSWORD_REGEX.number.test(password)) score++;
  if (PASSWORD_REGEX.special.test(password)) score++;
  
  // Penalty for weak passwords
  if (isWeakPassword(password)) {
    score = Math.max(0, score - 2);
  }
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const normalizedScore = Math.min(5, Math.floor(score * 5 / 6));
  
  return {
    score: normalizedScore,
    label: labels[normalizedScore]
  };
}