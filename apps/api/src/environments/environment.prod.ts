export const environment = {
  production: true,
  port: parseInt(process.env['PORT'] || '3333', 10),
  globalPrefix: 'api',
  databaseUrl: process.env['DATABASE_URL'],
  jwtSecret: process.env['JWT_SECRET'],
  corsOrigins: process.env['CORS_ORIGINS']?.split(',') || [
    'https://admin.kairos.church',
    'https://app.kairos.church',
  ],
};
