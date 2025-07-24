import { logger } from './logger';

// Configurações centralizadas com validação
export const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'development',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpires: process.env.JWT_EXPIRES || '7d',
  }
};

// Validação das configs obrigatórias na inicialização
export const validateConfig = () => {
  const required = [
    { key: 'DATABASE_URL', value: config.database.url },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing.map(m => m.key));
    process.exit(1);
  }

  if (config.server.env === 'production' && config.auth.jwtSecret === 'dev-secret-change-in-production') {
    logger.error('JWT_SECRET must be set in production');
    process.exit(1);
  }

  logger.info('Configuration validated successfully');
};