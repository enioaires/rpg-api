import { z } from 'zod';

// ==========================================
// API Response Types
// ==========================================
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.number().optional()
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  timestamp: z.string()
});

// ==========================================
// User Schemas
// ==========================================
export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username deve ter pelo menos 3 caracteres')
    .max(50, 'Username deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username pode conter apenas letras, números e underscore'),
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const LoginUserSchema = z.object({
  login: z.string().min(1, 'Username ou email é obrigatório'), // Aceita username OU email
  password: z.string().min(1, 'Senha é obrigatória')
});

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date()
});

// ==========================================
// Character Schemas
// ==========================================
export const CharacterDataSchema = z.object({
  // Por enquanto aceita qualquer coisa - vamos definir depois
  attributes: z.record(z.any()).optional(),
  skills: z.record(z.any()).optional(),
  inventory: z.array(z.any()).optional(),
  notes: z.string().optional()
});

export const CreateCharacterSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  data: CharacterDataSchema.default({})
});

export const UpdateCharacterSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').optional(),
  data: CharacterDataSchema.optional()
});

export const CharacterSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  data: CharacterDataSchema,
  updatedAt: z.date(),
  createdAt: z.date()
});

// ==========================================
// TypeScript Types (inferidos do Zod)
// ==========================================
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export type CreateUser = z.infer<typeof CreateUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type User = z.infer<typeof UserSchema>;

export type CharacterData = z.infer<typeof CharacterDataSchema>;
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;
export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
export type Character = z.infer<typeof CharacterSchema>;