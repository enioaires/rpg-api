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

    logger.info('Character retrieved', { userId, characterId: id });

    return responses.success(c, { character: character[0] });

  } catch (error) {
    logger.error('Failed to get character', error);
    return responses.error(c, 'Erro ao buscar personagem');
  }
});

// ==========================================
// POST /characters - Criar novo personagem
// ==========================================
charactersRoutes.post('/', validateJSON(CreateRPGCharacterSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { name, data } = c.req.valid('json');

    logger.info('Creating character', { userId, characterName: name });

    const newCharacters = await db.insert(characters).values({
      userId,
      name,
      data: data as any
    }).returning();

    const newCharacter = newCharacters[0];
    if (!newCharacter) {
      return responses.error(c, 'Erro ao criar personagem');
    }

    logger.info('Character created', { userId, characterId: newCharacter.id });

    return responses.created(c, { character: newCharacter }, 'Personagem criado!');

  } catch (error) {
    logger.error('Failed to create character', error);
    return responses.error(c, 'Erro interno do servidor');
  }
});

// ==========================================
// PUT /characters/:id - Atualizar personagem
// ==========================================
charactersRoutes.put('/:id',
  validateParam(z.object({ id: z.string().regex(/^\d+$/).transform(Number) })),
  validateJSON(UpdateRPGCharacterSchema),
  async (c) => {
    try {
      const { userId } = c.get('user');
      const { id } = c.req.valid('param');
      const updateData = c.req.valid('json');

      // Verifica se existe
      const existing = await db.select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        return responses.notFound(c, 'Personagem');
      }

      // Atualiza
      const updated = await db.update(characters)
        .set({
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.data && { data: updateData.data as any })
        })
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning();

      logger.info('Character updated', { userId, characterId: id });

      return responses.success(c, { character: updated[0] }, 'Personagem atualizado!');

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

// ==========================================
// Funções de cálculo
// ==========================================
function calculateVitality(raceBase: number, classBase: number, level: number): number {
  return (raceBase + classBase) * (level + 1);
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

function calculateVitalityLevels(totalVitality: number) {
  const step = Math.floor(totalVitality / 6);
  return {
    notable: totalVitality,
    injured: totalVitality - step,
    severelyInjured: totalVitality - (step * 2),
    condemned: totalVitality - (step * 3),
    incapacitated: totalVitality - (step * 4),
    coma: totalVitality - (step * 5)
  };
}

// ==========================================
// GET /characters/:id/calculated - Personagem com TODOS os cálculos
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

    // Monta resposta com TODOS os dados calculados
    const calculatedCharacter = {
      // Dados básicos do banco
      id: rawCharacter?.id,
      name: rawCharacter?.name,
      userId: rawCharacter?.userId,
      createdAt: rawCharacter?.createdAt,
      updatedAt: rawCharacter?.updatedAt,

      // Dados brutos originais
      data: data,

      // TODOS OS CÁLCULOS
      calculated: {
        // Vitalidade
        vitality: {
          total: calculateVitality(data.vitality.raceBase, data.vitality.classBase, level),
          base: data.vitality.raceBase + data.vitality.classBase,
          multiplier: level + 1,
          levels: calculateVitalityLevels(
            calculateVitality(data.vitality.raceBase, data.vitality.classBase, level)
          )
        },

        // Berkana
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

        // Informações de progressão
        progression: {
          currentLevel: level,
          nextLevel: level + 1,
          xpCurrent: data.basicInfo.currentXp,
          xpForNext: data.basicInfo.nextLevelXp,
          xpProgress: data.basicInfo.nextLevelXp > 0
            ? Math.round((data.basicInfo.currentXp / data.basicInfo.nextLevelXp) * 100)
            : 0
        }
      }
    };

    logger.info('Calculated character data retrieved', {
      userId,
      characterId: id,
      level
    });

    return responses.success(c, {
      character: calculatedCharacter
    }, 'Dados calculados do personagem');

  } catch (error) {
    logger.error('Failed to get calculated character data', error);
    return responses.error(c, 'Erro ao calcular dados do personagem');
  }
});

export default charactersRoutes;