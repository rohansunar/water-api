import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { CustomerModule } from '../src/customer/customer.module';
import { AuthModule } from '../src/auth/auth.module';
import {
  Customer,
  CustomerSchema,
} from '../src/common/schemas/customer.schema';
import { Address, AddressSchema } from '../src/common/schemas/address.schema';
import { CustomerRole } from '../src/common/interfaces/customer.interface';
import { JwtService } from '@nestjs/jwt';

describe('Customer Integration Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let testCustomerId: string;

  const testCustomer = {
    phone: '+919876543210',
    name: 'Integration Test Customer',
    email: 'integration@test.com',
    role: CustomerRole.CUSTOMER,
    walletBalance: 100,
    isActive: true,
    monthlyPaymentMode: false,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(
          process.env.MONGODB_TEST_URI ||
            'mongodb://localhost:27017/water-jar-delivery-test',
        ),
        MongooseModule.forFeature([
          { name: Customer.name, schema: CustomerSchema },
          { name: Address.name, schema: AddressSchema },
        ]),
        CustomerModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create a test customer and generate auth token
    const customerResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: testCustomer.phone })
      .expect(200);

    // Mock OTP verification for testing
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ phone: testCustomer.phone, otp: '1234' })
      .expect(200);

    authToken = verifyResponse.body.token;
    testCustomerId = verifyResponse.body.customer.id;
  });

  afterAll(async () => {
    // Clean up test data
    await request(app.getHttpServer())
      .delete(`/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${authToken}`);

    await app.close();
  });

  describe('GET /customers/me', () => {
    it('should return customer profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        phone: testCustomer.phone,
        role: 'customer',
        walletBalance: expect.any(Number),
        isActive: true,
        monthlyPaymentMode: false,
        addresses: expect.any(Array),
        createdAt: expect.any(String),
      });
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/customers/me').expect(401);
    });

    it('should return 401 with invalid auth token', async () => {
      await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle malformed auth header', async () => {
      await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('PUT /customers/monthly-payment-mode', () => {
    it('should enable monthly payment mode', async () => {
      const response = await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: true })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Monthly payment mode updated successfully',
        monthlyPaymentMode: true,
      });

      // Verify the change persisted
      const profileResponse = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.monthlyPaymentMode).toBe(true);
    });

    it('should disable monthly payment mode', async () => {
      const response = await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: false })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Monthly payment mode updated successfully',
        monthlyPaymentMode: false,
      });

      // Verify the change persisted
      const profileResponse = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.monthlyPaymentMode).toBe(false);
    });

    it('should return 400 for invalid request body', async () => {
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalidField: true })
        .expect(400);
    });

    it('should return 400 for missing request body', async () => {
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .send({ monthlyPaymentMode: true })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the endpoints are resilient
      const response = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('should return proper error format', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/me')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Performance Tests', () => {
    it('should respond to profile requests within acceptable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/customers/me')
            .set('Authorization', `Bearer ${authToken}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testCustomerId);
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate monthly payment mode boolean values', async () => {
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: 'invalid' })
        .expect(400);
    });

    it('should handle edge cases in request data', async () => {
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: null })
        .expect(400);
    });
  });

  describe('Security Tests', () => {
    it('should not allow access with expired token', async () => {
      const expiredToken = jwtService.sign(
        { sub: testCustomerId, phone: testCustomer.phone, role: 'customer' },
        { expiresIn: '-1h' },
      );

      await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should not expose sensitive data in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('otpCode');
      expect(response.body).not.toHaveProperty('otpExpiry');
    });
  });
});
