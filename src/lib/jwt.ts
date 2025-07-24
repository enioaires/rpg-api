import { SignJWT, jwtVerify } from 'jose';
import { config } from './config';
import { logger } from './logger';

// Converte secret string para Uint8Array (exigido pelo jose)
const secret = new TextEncoder().encode(config.auth.jwtSecret);

// Payload customizado para nosso JWT
export interface CustomJWTPayload {
  userId: number;
  username: string;
  email: string;
}

// Gera um novo JWT token
export const generateToken = async (payload: CustomJWTPayload): Promise<string> => {
  try {
    const token = await new SignJWT({
      userId: payload.userId,
      username: payload.username,
      email: payload.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // 30 dias conforme definido
      .sign(secret);

    logger.debug('JWT token generated', { userId: payload.userId, username: payload.username });
    return token;
  } catch (error) {
    logger.error('Failed to generate JWT token', error);
    throw new Error('Erro ao gerar token de autenticação');
  }
};

// Verifica e decodifica um JWT token
export const verifyToken = async (token: string): Promise<CustomJWTPayload> => {
  try {
    const { payload } = await jwtVerify(token, secret);

    // Valida se o payload tem os campos necessários
    if (!payload.userId || !payload.username || !payload.email) {
      throw new Error('Token payload inválido');
    }

    const customPayload: CustomJWTPayload = {
      userId: payload.userId as number,
      username: payload.username as string,
      email: payload.email as string
    };

    logger.debug('JWT token verified', { userId: customPayload.userId, username: customPayload.username });
    return customPayload;
  } catch (error) {
    logger.warn('JWT token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      token: token.substring(0, 20) + '...' // Log só o início do token por segurança
    });
    throw new Error('Token inválido ou expirado');
  }
};