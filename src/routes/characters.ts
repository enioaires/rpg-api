// src/routes/characters.ts - CORREÇÕES SISTÊMICAS
import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { characters } from '../db/schema';
import { validateJSON, validateParam } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { responses } from '../lib/responses';
import { logger } from '../lib/logger';
import { CreateRPGCharacterSchema, UpdateRPGCharacterSchema, type RPGCharacterData } from '../lib/types';

const charactersRoutes = new Hono();

// Todos os endpoints exigem autenticação
charactersRoutes.use('*', requireAuth);

// ==========================================
// GET /characters - Listar personagens do usuário
// ==========================================
charactersRoutes.get('/', async (c) => {
  try {
    const { userId } = c.get('user');

    const userCharacters = await db.select({
      id: characters.id,
      name: characters.name,
      data: characters.data,
      updatedAt: characters.updatedAt,
      createdAt: characters.createdAt
    })
      .from(characters)
      .where(eq(characters.userId, userId))
      .orderBy(characters.updatedAt);

    logger.info('Characters listed', { userId, count: userCharacters.length });

    return responses.success(c, { characters: userCharacters });

  } catch (error) {
    logger.error('Failed to list characters', error);
    return responses.error(c, 'Erro ao listar personagens');
  }
});

// ==========================================
// GET /characters/:id - Buscar personagem específico
// ==========================================
charactersRoutes.get('/:id', validateParam(z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
})), async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    const character = await db.select()
      .from(characters)
      .where(and(
        eq(characters.id, id),
        eq(characters.userId, userId)
      ))
      .limit(1);

    if (character.length === 0) {
      return responses.notFound(c, 'Personagem');
    }

    logger.info('Character retrieved', { userId, characterId: id, name: character[0]?.name });

    return responses.success(c, { character: character[0] });

  } catch (error) {
    logger.error('Failed to get character', error);
    return responses.error(c, 'Erro interno do servidor');
  }
});

// ==========================================
// FUNÇÕES DE CÁLCULO CORRIGIDAS
// ==========================================

// CORRIGIDO: XP necessário = próximo nível × 10
function calculateNextLevelXp(nextLevel: number): number {
  return nextLevel * 10;
}

// CORRIGIDO: Vitalidade é a SOMA de todos os níveis de ferimento
function calculateVitalityLevels(raceBase: number, classBase: number, level: number) {
  const baseVitality = raceBase + classBase;
  const multiplier = level + 1;

  // Calcula cada nível individual
  const notable = baseVitality * multiplier;
  const injured = (baseVitality - 20) * multiplier;
  const severelyInjured = (baseVitality - 40) * multiplier;
  const condemned = (baseVitality - 60) * multiplier;
  const incapacitated = (baseVitality - 80) * multiplier;
  const coma = (baseVitality - 100) * multiplier;

  // SOMA TOTAL = soma de todos os níveis
  const totalVitality = notable + injured + severelyInjured + condemned + incapacitated + coma;

  return {
    total: totalVitality,
    levels: {
      notable,
      injured,
      severelyInjured,
      condemned,
      incapacitated,
      coma
    }
  };
}

function calculateBerkana(baseValue: number, level: number): number {
  return baseValue + (level * 10);
}

function calculateAttribute(raceValue: number, classValue: number, level: number): number {
  const levelBonus = Math.floor(level / 5); // +1 a cada 5 níveis
  return raceValue + classValue + levelBonus;
}

function calculateWeaponPercentage(basePercentage: number, level: number): number {
  return Math.min(100, basePercentage + level); // Máximo 100%
}

// ==========================================
// GET /characters/:id/calculated - Personagem com TODOS os cálculos CORRIGIDOS
// ==========================================
charactersRoutes.get('/:id/calculated', validateParam(z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
})), async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    // Busca o personagem
    const character = await db.select()
      .from(characters)
      .where(and(
        eq(characters.id, id),
        eq(characters.userId, userId)
      ))
      .limit(1);

    if (character.length === 0) {
      return responses.notFound(c, 'Personagem');
    }

    const rawCharacter = character[0];
    const data = rawCharacter?.data as RPGCharacterData;
    const level = data.basicInfo.currentLevel;

    // Calcula TODOS os atributos totais
    const attributeNames = [
      'agility', 'charisma', 'courage', 'dexterity', 'dodge',
      'strength', 'intelligence', 'initiative', 'intimidate',
      'maneuver', 'reflexes', 'wisdom', 'vigor', 'willpower'
    ] as const;

    const calculatedAttributes: Record<string, number> = {};
    attributeNames.forEach(attr => {
      calculatedAttributes[attr] = calculateAttribute(
        data.attributes.race[attr],
        data.attributes.class[attr],
        level
      );
    });

    // CORRIGIDO: Cálculo correto da vitalidade
    const vitalityCalculation = calculateVitalityLevels(
      data.vitality.raceBase,
      data.vitality.classBase,
      level
    );

    // CORRIGIDO: XP para próximo nível
    const nextLevel = level + 1;
    const xpForNext = calculateNextLevelXp(nextLevel);

    // Monta resposta com TODOS os dados calculados CORRIGIDOS
    const calculatedCharacter = {
      // Dados básicos do banco
      id: rawCharacter?.id,
      name: rawCharacter?.name,
      userId: rawCharacter?.userId,
      createdAt: rawCharacter?.createdAt,
      updatedAt: rawCharacter?.updatedAt,

      // Dados brutos originais
      data: data,

      // TODOS OS CÁLCULOS CORRIGIDOS
      calculated: {
        // Vitalidade CORRIGIDA
        vitality: {
          total: vitalityCalculation.total,
          base: data.vitality.raceBase + data.vitality.classBase,
          multiplier: level + 1,
          levels: vitalityCalculation.levels
        },

        // Berkana (já estava correto)
        berkana: {
          total: calculateBerkana(data.berkana.baseValue, level),
          base: data.berkana.baseValue,
          levelBonus: level * 10
        },

        // Todos os atributos calculados
        attributes: {
          totals: calculatedAttributes,
          levelBonus: Math.floor(level / 5),
          nextBonusAtLevel: Math.ceil((level + 1) / 5) * 5
        },

        // Armas com porcentagens calculadas
        weapons: {
          weapon1: {
            ...data.weapons.weapon1,
            calculatedPercentage: calculateWeaponPercentage(data.weapons.weapon1.percentage, level)
          },
          weapon2: {
            ...data.weapons.weapon2,
            calculatedPercentage: calculateWeaponPercentage(data.weapons.weapon2.percentage, level)
          },
          weapon3: {
            ...data.weapons.weapon3,
            calculatedPercentage: calculateWeaponPercentage(data.weapons.weapon3.percentage, level)
          }
        },

        // Status da armadura
        armor: {
          ...data.armor,
          durabilityPercentage: data.armor.vitalityTotal > 0
            ? Math.round((data.armor.vitalityCurrent / data.armor.vitalityTotal) * 100)
            : 0,
          status: data.armor.vitalityCurrent <= 0 ? 'broken' :
            data.armor.vitalityCurrent < (data.armor.vitalityTotal * 0.3) ? 'damaged' : 'good'
        },

        // Informações de progressão CORRIGIDAS
        progression: {
          currentLevel: level,
          nextLevel: nextLevel,
          xpCurrent: data.basicInfo.currentXp,
          xpForNext: xpForNext, // CORRIGIDO: próximo nível × 10
          xpProgress: xpForNext > 0
            ? Math.round((data.basicInfo.currentXp / xpForNext) * 100)
            : 0
        }
      }
    };

    logger.info('Calculated character data retrieved', {
      userId,
      characterId: id,
      level,
      totalVitality: vitalityCalculation.total,
      xpForNext
    });

    return responses.success(c, {
      character: calculatedCharacter
    }, 'Dados calculados do personagem');

  } catch (error) {
    logger.error('Failed to get calculated character data', error);
    return responses.error(c, 'Erro ao calcular dados do personagem');
  }
});

// ==========================================
// POST /characters - Criar personagem
// ==========================================
charactersRoutes.post('/', validateJSON(CreateRPGCharacterSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const validatedData = c.req.valid('json');

    // CORRIGIDO: Define nextLevelXp corretamente ao criar
    const level = validatedData.data.basicInfo.currentLevel;
    const nextLevel = level + 1;
    validatedData.data.basicInfo.nextLevelXp = calculateNextLevelXp(nextLevel);

    const newCharacter = await db.insert(characters).values({
      userId,
      name: validatedData.name,
      data: validatedData.data
    }).returning();

    logger.info('Character created', {
      userId,
      characterId: newCharacter[0]?.id,
      characterName: validatedData.data.basicInfo.characterName
    });

    return responses.success(c, { character: newCharacter[0] }, 'Personagem criado com sucesso!');

  } catch (error) {
    logger.error('Failed to create character', error);
    return responses.error(c, 'Erro interno do servidor');
  }
});

// ==========================================
// PUT /characters/:id - Atualizar personagem
// ==========================================
charactersRoutes.put('/:id',
  validateParam(z.object({
    id: z.string().regex(/^\d+$/).transform(Number)
  })),
  validateJSON(UpdateRPGCharacterSchema),
  async (c) => {
    try {
      const { userId } = c.get('user');
      const { id } = c.req.valid('param');
      const updateData = c.req.valid('json');

      // Verifica se o personagem existe e pertence ao usuário
      const existing = await db.select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        return responses.notFound(c, 'Personagem');
      }

      // CORRIGIDO: Atualiza nextLevelXp se o nível mudou
      if (updateData.data?.basicInfo?.currentLevel) {
        const newLevel = updateData.data.basicInfo.currentLevel;
        const nextLevel = newLevel + 1;
        updateData.data.basicInfo.nextLevelXp = calculateNextLevelXp(nextLevel);
      }

      // Monta dados para update
      const updateFields: any = { updatedAt: new Date() };
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.data !== undefined) {
        // Merge com dados existentes
        const currentData = existing[0]?.data as RPGCharacterData;
        updateFields.data = { ...currentData, ...updateData.data };
      }

      const updatedCharacter = await db.update(characters)
        .set(updateFields)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning();

      logger.info('Character updated', { userId, characterId: id });

      return responses.success(c, { character: updatedCharacter[0] }, 'Personagem atualizado!');

    } catch (error) {
      logger.error('Failed to update character', error);
      return responses.error(c, 'Erro interno do servidor');
    }
  }
);

// ==========================================
// DELETE /characters/:id - Deletar personagem
// ==========================================
charactersRoutes.delete('/:id', validateParam(z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
})), async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    // Verifica se existe
    const existing = await db.select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return responses.notFound(c, 'Personagem');
    }

    // Deleta
    await db.delete(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)));

    logger.info('Character deleted', { userId, characterId: id });

    return responses.success(c, {}, 'Personagem deletado!');

  } catch (error) {
    logger.error('Failed to delete character', error);
    return responses.error(c, 'Erro interno do servidor');
  }
});

export default charactersRoutes;