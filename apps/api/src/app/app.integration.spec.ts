import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('AppController (integration)', () => {
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

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  describe('API Modules', () => {
    const modules = [
      'members',
      'departments',
      'fellowships',
      'events',
      'finance',
      'forms',
      'communications',
      'security',
      'settings',
      'outreach',
    ];

    modules.forEach((module) => {
      it(`should have ${module} endpoints available`, () => {
        return request(app.getHttpServer())
          .get(`/${module}`)
          .expect((res) => {
            // Should not return 404 (module exists)
            expect(res.status).not.toBe(404);
          });
      });
    });
  });
});
