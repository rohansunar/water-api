import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { VendorAuthService } from '../../src/vendor/services/vendor-auth.service';

describe('Vendor Authentication (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let vendorAuthService: VendorAuthService;
  let testVendor: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    // Set test environment for OTP
    process.env.OTP_TEST_MODE = 'true';

    await app.init();

    prismaService = app.get(PrismaService);
    vendorAuthService = app.get(VendorAuthService);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await prismaService.vendor.deleteMany({
      where: { phone: { startsWith: '+91' } },
    });

    // Create a test vendor for authentication
    const hashedPassword =
      await vendorAuthService.hashPassword('testPassword123');
    testVendor = await prismaService.vendor.create({
      data: {
        phone: '+919876543210',
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
      where: { phone: { startsWith: '+91' } },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /vendors/auth/send-otp', () => {
    it('should successfully send OTP for valid phone number', async () => {
      const sendOtpDto = {
        phone: '+919876543211',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/send-otp')
        .send(sendOtpDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('expiresIn', 30);
      expect(response.body).toHaveProperty('otp'); // Available in test mode
    });

    it('should fail with missing phone field', async () => {
      const response = await request(app.getHttpServer())
        .post('/vendors/auth/send-otp')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('POST /vendors/auth/verify-otp', () => {
    let otp: string;

    beforeEach(async () => {
      // Send OTP first
      const sendOtpDto = {
        phone: '+919876543212',
      };

      const sendResponse = await request(app.getHttpServer())
        .post('/vendors/auth/send-otp')
        .send(sendOtpDto)
        .expect(200);

      otp = sendResponse.body.otp;
    });

    it('should successfully verify OTP and create vendor with name not set', async () => {
      const verifyOtpDto = {
        phone: '+919876543212',
        otp,
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('vendor');
      expect(response.body).toHaveProperty('expiresIn');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
      expect(response.body.vendor).toHaveProperty('id');
      expect(response.body.vendor).toHaveProperty('businessName', null); // Name not set during OTP creation
      expect(response.body.vendor).toHaveProperty('phone', '+919876543212');
      expect(response.body.expiresIn).toBe(36000);
    });

    it('should fail verification with invalid OTP', async () => {
      const verifyOtpDto = {
        phone: '+919876543212',
        otp: 'invalid',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Invalid OTP');
    });

    it('should fail with missing phone field', async () => {
      const verifyOtpDto = {
        otp,
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should fail with missing otp field', async () => {
      const verifyOtpDto = {
        phone: '+919876543212',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('POST /vendors/auth/login', () => {
    it('should successfully authenticate vendor with valid phone and password', async () => {
      const loginDto = {
        phone: '+919876543210',
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
      expect(response.body.vendor).toHaveProperty(
        'businessName',
        'Test Vendor',
      );
      expect(response.body.vendor).toHaveProperty('phone', '+919876543210');
      expect(response.body.expiresIn).toBe(36000);
    });

    it('should fail authentication with invalid phone number', async () => {
      const loginDto = {
        phone: '+911234567890',
        password: 'testPassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty(
        'message',
        'Invalid phone or password',
      );
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should fail authentication with wrong password', async () => {
      const loginDto = {
        phone: '+919876543210',
        password: 'wrongPassword',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty(
        'message',
        'Invalid phone or password',
      );
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should fail authentication for inactive vendor account', async () => {
      // Deactivate the test vendor
      await prismaService.vendor.update({
        where: { id: testVendor.id },
        data: { isActive: false },
      });

      const loginDto = {
        phone: '+919876543210',
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
        phone: '+919876543210',
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
        phone: '+919876543210',
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
        phone: '+919876543210',
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
      expect(new Date(afterLogin.lastActiveAt).getTime()).toBeGreaterThan(
        beforeLogin.lastActiveAt
          ? new Date(beforeLogin.lastActiveAt).getTime()
          : 0,
      );
    });
  });
});
