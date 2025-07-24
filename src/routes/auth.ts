import { Hono } from 'hono';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { validateJSON } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { responses } from '../lib/responses';
import { logger } from '../lib/logger';
import { hashPassword, verifyPassword } from '../lib/password';
import { generateToken } from '../lib/jwt';
import { CreateUserSchema, LoginUserSchema } from '../lib/types';

const auth = new Hono();

// POST /auth/register - Criar nova conta
auth.post('/register', validateJSON(CreateUserSchema), async (c) => {
  try {
    const { username, email, name, password } = c.req.valid('json');

    logger.info('Registration attempt', { username, email });

    // Verifica se username ou email já existem
    const existingUsers = await db.select()
      .from(users)
      .where(or(
        eq(users.username, username),
        eq(users.email, email)
      ))
      .limit(1);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      const conflict = existingUser?.username === username ? 'Username' : 'Email';
      logger.warn('Registration failed - user exists', { username, email, conflict });
      return responses.error(c, `${conflict} já está em uso`, 409);
    }

    // Hash da senha
    const passwordHash = await hashPassword(password);

    // Cria o usuário
    const newUsers = await db.insert(users).values({
      username,
      email,
      name,
      passwordHash
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt
    });

    const newUser = newUsers[0];
    if (!newUser) {
      logger.error('Failed to create user - no data returned');
      return responses.error(c, 'Erro ao criar usuário');
    }

    // Gera token JWT
    const token = await generateToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email
    });

    logger.info('User registered successfully', {
      userId: newUser.id,
      username: newUser.username
    });

    return responses.created(c, {
      user: newUser,
      token
    }, 'Conta criada com sucesso!');

  } catch (error) {
    logger.error('Registration failed', error);
    return responses.error(c, 'Erro interno do servidor');
  }
});

// POST /auth/login - Fazer login
auth.post('/login', validateJSON(LoginUserSchema), async (c) => {
  try {
    const { login, password } = c.req.valid('json');

    logger.info('Login attempt', { login });

    // Busca usuário por username OU email
    const foundUsers = await db.select()
      .from(users)
      .where(or(
        eq(users.username, login),
        eq(users.email, login)
      ))
      .limit(1);

    const user = foundUsers[0];
    if (!user) {
      logger.warn('Login failed - user not found', { login });
      return responses.unauthorized(c, 'Credenciais inválidas');
    }

    // Verifica a senha
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      logger.warn('Login failed - wrong password', {
        userId: user.id,
        username: user.username
      });
      return responses.unauthorized(c, 'Credenciais inválidas');
    }

    // Gera token JWT
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email
    });

    logger.info('Login successful', {
      userId: user.id,
      username: user.username
    });

    return responses.success(c, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token
    }, 'Login realizado com sucesso!');

  } catch (error) {
    logger.error('Login failed', error);
    return responses.error(c, 'Erro interno do servidor');
  }
});

// GET /auth/me - Dados do usuário logado
auth.get('/me', requireAuth, async (c) => {
  try {
    const { userId } = c.get('user');

    // Busca dados atualizados do usuário
    const foundUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = foundUsers[0];
    if (!user) {
      logger.warn('User not found in /me endpoint', { userId });
      return responses.notFound(c, 'Usuário');
    }

    logger.debug('User data retrieved', { userId: user.id });

    return responses.success(c, { user });

  } catch (error) {
    logger.error('Failed to get user data', error);
    return responses.error(c, 'Erro interno do servidor');
  }
});

export default auth;