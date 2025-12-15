export const environment = {
  production: false,
  port: parseInt(process.env['PORT'] || '3333', 10),
  globalPrefix: 'api',
  databaseUrl:
    process.env['DATABASE_URL'] ||
    'postgresql://postgres:password@localhost:5432/kairos_dev',
  jwtSecret: process.env['JWT_SECRET'] || 'dev-secret-key',
  corsOrigins: ['http://localhost:4200', 'http://localhost:4201'],
};
