import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app/app.module';
import { swaggerConfig } from './swagger.config';

describe('Swagger Configuration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should generate OpenAPI document successfully', () => {
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document).toBeDefined();
    expect(document.openapi).toBe('3.0.0');
    expect(document.info).toBeDefined();
    expect(document.info.title).toBe('Kairos Church Management System API');
    expect(document.info.version).toBe('1.0.0');
  });

  it('should include all required tags', () => {
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    const expectedTags = [
      'members',
      'departments',
      'events',
      'communications',
      'fellowships',
      'finance',
      'forms',
      'outreach',
      'security',
      'settings',
    ];

    expectedTags.forEach((tag) => {
      expect(document.tags?.some((t) => t.name === tag)).toBe(true);
    });
  });

  it('should include server configurations', () => {
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document.servers).toBeDefined();
    expect(document.servers?.length).toBeGreaterThan(0);

    const devServer = document.servers?.find(
      (s) => s.url === 'http://localhost:3333'
    );
    expect(devServer).toBeDefined();
    expect(devServer?.description).toBe('Development Server');
  });

  it('should include contact and license information', () => {
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document.info.contact).toBeDefined();
    expect(document.info.contact?.name).toBe('Kairos Development Team');
    expect(document.info.contact?.email).toBe('dev@kairos-church.org');

    expect(document.info.license).toBeDefined();
    expect(document.info.license?.name).toBe('MIT');
  });

  it('should include paths from existing controllers', () => {
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document.paths).toBeDefined();
    expect(Object.keys(document.paths).length).toBeGreaterThan(0);

    // Check for some expected paths from existing controllers
    const pathKeys = Object.keys(document.paths);
    expect(pathKeys.some((path) => path.includes('/members'))).toBe(true);
    expect(pathKeys.some((path) => path.includes('/departments'))).toBe(true);
    expect(pathKeys.some((path) => path.includes('/events'))).toBe(true);
  });
});
