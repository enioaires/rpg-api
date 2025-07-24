import { z } from 'zod';

// ==========================================
// API Response Types (MANTIDOS)
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
// User Schemas (MANTIDOS)
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
  login: z.string().min(1, 'Username ou email é obrigatório'),
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
// Character Schemas ANTIGOS (MANTIDOS para compatibilidade)
// ==========================================
export const CharacterDataSchema = z.object({
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
// RPG Schemas NOVOS
// ==========================================

// Informações Básicas
export const RPGBasicInfoSchema = z.object({
  playerName: z.string().min(1, 'Nome do jogador é obrigatório'),
  characterName: z.string().min(1, 'Nome do personagem é obrigatório'),
  characterImage: z.string().optional(),
  class: z.string().min(1, 'Classe é obrigatória'),
  race: z.string().min(1, 'Raça é obrigatória'),
  deity: z.string().optional(),
  homeland: z.string().optional(),
  alignment: z.string().optional(),
  gender: z.string().optional(),
  age: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  virtuePoints: z.number().min(0).default(0),
  currentLevel: z.number().min(0).default(0),
  currentXp: z.number().min(0).default(0),
  nextLevelXp: z.number().min(1).default(100)
});

// Atributos (mesmo conjunto para raça e classe)
export const AttributeSetSchema = z.object({
  agility: z.number().min(0).default(0),
  charisma: z.number().min(0).default(0),
  courage: z.number().min(0).default(0),
  dexterity: z.number().min(0).default(0),
  dodge: z.number().min(0).default(0),
  strength: z.number().min(0).default(0),
  intelligence: z.number().min(0).default(0),
  initiative: z.number().min(0).default(0),
  intimidate: z.number().min(0).default(0),
  maneuver: z.number().min(0).default(0),
  reflexes: z.number().min(0).default(0),
  wisdom: z.number().min(0).default(0),
  vigor: z.number().min(0).default(0),
  willpower: z.number().min(0).default(0)
});

export const RPGAttributesSchema = z.object({
  race: AttributeSetSchema,
  class: AttributeSetSchema
});

// Vitalidade
export const RPGVitalitySchema = z.object({
  raceBase: z.number().min(0).default(0),
  classBase: z.number().min(0).default(0)
});

// Berkana
export const RPGBerkanaSchema = z.object({
  baseValue: z.number().min(0).default(100)
});

// Arma
export const RPGWeaponSchema = z.object({
  name: z.string().default(''),
  image: z.string().optional(),
  percentage: z.number().min(0).max(100).default(0),
  damage25: z.number().min(0).default(0),
  damage50: z.number().min(0).default(0),
  damage75: z.number().min(0).default(0),
  damage100: z.number().min(0).default(0),
  damageCritical: z.number().min(0).default(0),
  observations: z.string().default('')
});

export const RPGWeaponsSchema = z.object({
  weapon1: RPGWeaponSchema,
  weapon2: RPGWeaponSchema,
  weapon3: RPGWeaponSchema
});

// Armadura
export const RPGArmorSchema = z.object({
  description: z.string().default(''),
  image: z.string().optional(),
  type: z.string().default(''),
  vitalityTotal: z.number().min(0).default(0),
  vitalityCurrent: z.number().min(0).default(0),
  observations: z.string().default('')
});

// Schema completo do personagem RPG
export const RPGCharacterDataSchema = z.object({
  basicInfo: RPGBasicInfoSchema,
  attributes: RPGAttributesSchema,
  vitality: RPGVitalitySchema,
  berkana: RPGBerkanaSchema,
  weapons: RPGWeaponsSchema,
  armor: RPGArmorSchema
});

// Schemas para API
export const CreateRPGCharacterSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  data: RPGCharacterDataSchema
});

export const UpdateRPGCharacterSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  data: RPGCharacterDataSchema.optional()
});

// ==========================================
// TypeScript Types
// ==========================================

// Types antigos (mantidos)
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type User = z.infer<typeof UserSchema>;
export type CharacterData = z.infer<typeof CharacterDataSchema>;
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;
export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
export type Character = z.infer<typeof CharacterSchema>;

// Types novos do RPG
export type RPGBasicInfo = z.infer<typeof RPGBasicInfoSchema>;
export type AttributeSet = z.infer<typeof AttributeSetSchema>;
export type RPGAttributes = z.infer<typeof RPGAttributesSchema>;
export type RPGVitality = z.infer<typeof RPGVitalitySchema>;
export type RPGBerkana = z.infer<typeof RPGBerkanaSchema>;
export type RPGWeapon = z.infer<typeof RPGWeaponSchema>;
export type RPGWeapons = z.infer<typeof RPGWeaponsSchema>;
export type RPGArmor = z.infer<typeof RPGArmorSchema>;
export type RPGCharacterData = z.infer<typeof RPGCharacterDataSchema>;
export type CreateRPGCharacter = z.infer<typeof CreateRPGCharacterSchema>;
export type UpdateRPGCharacter = z.infer<typeof UpdateRPGCharacterSchema>;