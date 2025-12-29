import { DocumentBuilder } from '@nestjs/swagger';

/**
 * OpenAPI/Swagger configuration for the Kairos Church Management System API
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('Kairos Church Management System API')
  .setDescription(
    `
    Comprehensive REST API for managing church operations including:
    - Member management and profiles
    - Department organization and leadership
    - Event planning and registration
    - Communication and messaging
    - Fellowship group coordination
    - Financial tracking and reporting
    - Form creation and submissions
    - Outreach and evangelism activities
    - Security and role-based access control
    - System settings and configuration
    
    This API follows OpenAPI 3.0 specification and provides complete
    documentation for all endpoints, data models, and validation rules.
  `
  )
  .setVersion('1.0.0')
  .setContact(
    'Kairos Development Team',
    'https://github.com/kairos-church/kairos',
    'dev@kairos-church.org'
  )
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addServer('http://localhost:3333', 'Development Server')
  .addServer('https://api-staging.kairos-church.org', 'Staging Server')
  .addServer('https://api.kairos-church.org', 'Production Server')
  .addTag(
    'members',
    'Member management operations - Create, read, update, and manage church member profiles'
  )
  .addTag(
    'departments',
    'Department management operations - Organize church departments and leadership'
  )
  .addTag(
    'events',
    'Event management operations - Plan, schedule, and manage church events'
  )
  .addTag(
    'communications',
    'Communication and messaging operations - Send announcements and messages'
  )
  .addTag(
    'fellowships',
    'Fellowship group management operations - Coordinate small groups and fellowships'
  )
  .addTag(
    'finance',
    'Financial management operations - Track donations, expenses, and financial reports'
  )
  .addTag(
    'forms',
    'Form management operations - Create and manage dynamic forms and submissions'
  )
  .addTag(
    'outreach',
    'Outreach and evangelism operations - Manage outreach programs and activities'
  )
  .addTag(
    'security',
    'Security and authentication operations - User authentication and authorization'
  )
  .addTag(
    'settings',
    'System settings and configuration operations - Manage application settings'
  )
  .build();

/**
 * Swagger UI configuration options
 */
export const swaggerOptions = {
  customSiteTitle: 'Kairos API Documentation',
  customfavIcon: '/favicon.ico',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1f2937; }
    .swagger-ui .info .description { color: #4b5563; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};
