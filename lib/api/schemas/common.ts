import { z } from 'zod';

// Project schemas (for future use)
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(['active', 'archived', 'draft']).default('draft')
});

export const createProjectSchema = projectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateProjectSchema = createProjectSchema.partial();

// Analysis schemas (for future use)
export const analysisRequestSchema = z.object({
  projectId: z.string().uuid(),
  scriptContent: z.string().min(1),
  scriptType: z.enum(['screenplay', 'stageplay', 'other']).default('screenplay'),
  options: z.object({
    includeCharacterAnalysis: z.boolean().default(true),
    includeSceneBreakdown: z.boolean().default(true),
    includeDialogueAnalysis: z.boolean().default(true),
    includeThemeAnalysis: z.boolean().default(true)
  }).optional()
});

export const analysisResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  result: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional()
});

// User schemas (for future use with auth)
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(['user', 'admin']).default('user'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  password: z.string().min(8).max(100)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Generic filter and sort schemas
export const filterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in']),
  value: z.any()
});

export const sortSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc')
});

// List request schema with pagination, filtering, and sorting
export const listRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  filters: z.array(filterSchema).optional(),
  sort: z.array(sortSchema).optional(),
  search: z.string().optional()
});

// List response schema
export function createListResponseSchema<T extends z.ZodSchema>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean()
    })
  });
}