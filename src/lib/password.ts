import bcrypt from 'bcryptjs';
import { logger } from './logger';

// Número de rounds para o salt (10 é um bom equilíbrio entre segurança e performance)
const SALT_ROUNDS = 10;

// Gera hash da senha
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    logger.debug('Password hashed successfully');
    return hash;
  } catch (error) {
    logger.error('Failed to hash password', error);
    throw new Error('Erro ao processar senha');
  }
};

// Verifica se a senha bate com o hash
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    const isValid = await bcrypt.compare(password, hash);
    logger.debug('Password verification completed', { isValid });
    return isValid;
  } catch (error) {
    logger.error('Failed to verify password', error);
    throw new Error('Erro ao verificar senha');
  }
};

// Gera senha aleatória (para reset manual)
export const generateRandomPassword = (length: number = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  logger.info('Random password generated');
  return password;
};