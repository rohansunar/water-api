import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { VendorAuthService } from '../../src/vendor/services/vendor-auth.service';

describe('Vendor Authentication (Integration)', () => {
  let app: NestFastifyApplication;
  let prismaService: PrismaService;
  let vendorAuthService: VendorAuthService;
  let testVendor: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();

    prismaService = app.get(PrismaService);
    vendorAuthService = app.get(VendorAuthService);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await prismaService.vendor.deleteMany({
      where: { phone: { startsWith: '+91-test' } },
    });

    // Create a test vendor for authentication
    const hashedPassword = await vendorAuthService.hashPassword('testPassword123');
    testVendor = await prismaService.vendor.create({
      data: {
        phone: '+91-test-9876543210',
        email: 'test-vendor@example.com',
        passwordHash: hashedPassword,
        name: 'Test Vendor',
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prismaService.vendor.deleteMany({
      where: { phone: { startsWith: '+91-test' } },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /vendors/auth/login', () => {
    it('should successfully authenticate vendor with valid phone and password', async () => {
      const loginDto = {
        phone: '+91-test-9876543210',
        password: 'testPassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('vendor');
      expect(response.body).toHaveProperty('expiresIn');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
      expect(response.body.vendor).toHaveProperty('id');
      expect(response.body.vendor).toHaveProperty('businessName', 'Test Vendor');
      expect(response.body.vendor).toHaveProperty('phone', '+91-test-9876543210');
      expect(response.body.expiresIn).toBe(3600);
    });

    it('should fail authentication with invalid phone number', async () => {
      const loginDto = {
        phone: '+91-nonexistent-1234567890',
        password: 'testPassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Invalid phone or password');
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should fail authentication with wrong password', async () => {
      const loginDto = {
        phone: '+91-test-9876543210',
        password: 'wrongPassword',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Invalid phone or password');
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should fail authentication for inactive vendor account', async () => {
      // Deactivate the test vendor
      await prismaService.vendor.update({
        where: { id: testVendor.id },
        data: { isActive: false },
      });

      const loginDto = {
        phone: '+91-test-9876543210',
        password: 'testPassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body).toHaveProperty('message', 'Account is inactive');
      expect(response.body).toHaveProperty('error', 'Forbidden');
    });

    it('should fail with missing phone field', async () => {
      const loginDto = {
        password: 'testPassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should fail with missing password field', async () => {
      const loginDto = {
        phone: '+91-test-9876543210',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should fail with password too short', async () => {
      const loginDto = {
        phone: '+91-test-9876543210',
        password: '123',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should update lastActiveAt timestamp on successful login', async () => {
      const loginDto = {
        phone: '+91-test-9876543210',
        password: 'testPassword123',
      };

      const beforeLogin = await prismaService.vendor.findUnique({
        where: { id: testVendor.id },
        select: { lastActiveAt: true },
      });

      await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(200);

      const afterLogin = await prismaService.vendor.findUnique({
        where: { id: testVendor.id },
        select: { lastActiveAt: true },
      });

      expect(afterLogin.lastActiveAt).not.toBeNull();
      expect(new Date(afterLogin.lastActiveAt!).getTime()).toBeGreaterThan(
        beforeLogin.lastActiveAt ? new Date(beforeLogin.lastActiveAt).getTime() : 0
      );
    });
  });
});