import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('Water Jar Delivery API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check', () => {
    it('/ (GET) - should return API welcome message', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Water Jar Delivery API - Ready to serve! 💧');
    });
  });

  describe('Basic API Structure', () => {
    it('should handle 404 for non-existent endpoints', () => {
      return request(app.getHttpServer())
        .get('/api/non-existent-endpoint')
        .expect(404);
    });

    it('should have proper CORS headers', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          // Check for CORS headers
          expect(res.headers).toHaveProperty('access-control-allow-origin');
        });
    });

    it('should have security headers', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          // Check for security headers
          expect(res.headers).toHaveProperty('x-content-type-options');
          expect(res.headers).toHaveProperty('x-frame-options');
        });
    });
  });
});
