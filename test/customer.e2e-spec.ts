import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

describe('Customer E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let testCustomerId: string;

  const testPhone = '+919876543210';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Complete authentication flow
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: testPhone })
      .expect(200);

    // Mock OTP verification (in real scenario, this would use actual OTP)
    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ phone: testPhone, otp: '1234' })
      .expect(200);

    authToken = verifyResponse.body.token;
    testCustomerId = verifyResponse.body.customer?.id || verifyResponse.body.user?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Customer Journey', () => {
    it('should complete full customer lifecycle', async () => {
      // 1. Get initial profile
      const initialProfile = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialProfile.body).toMatchObject({
        phone: testPhone,
        role: 'customer',
        isActive: true,
        monthlyPaymentMode: false,
      });

      // 2. Enable monthly payment mode
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: true })
        .expect(200);

      // 3. Verify monthly payment mode is enabled
      const updatedProfile = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedProfile.body.monthlyPaymentMode).toBe(true);

      // 4. Disable monthly payment mode
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: false })
        .expect(200);

      // 5. Verify monthly payment mode is disabled
      const finalProfile = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalProfile.body.monthlyPaymentMode).toBe(false);
    });
  });

  describe('API Consistency', () => {
    it('should maintain consistent response format across endpoints', async () => {
      const profileResponse = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check that response has expected structure
      expect(profileResponse.body).toHaveProperty('id');
      expect(profileResponse.body).toHaveProperty('phone');
      expect(profileResponse.body).toHaveProperty('role');
      expect(profileResponse.body).toHaveProperty('walletBalance');
      expect(profileResponse.body).toHaveProperty('isActive');
      expect(profileResponse.body).toHaveProperty('monthlyPaymentMode');
      expect(profileResponse.body).toHaveProperty('addresses');
      expect(profileResponse.body).toHaveProperty('createdAt');

      // Verify data types
      expect(typeof profileResponse.body.id).toBe('string');
      expect(typeof profileResponse.body.phone).toBe('string');
      expect(typeof profileResponse.body.role).toBe('string');
      expect(typeof profileResponse.body.walletBalance).toBe('number');
      expect(typeof profileResponse.body.isActive).toBe('boolean');
      expect(typeof profileResponse.body.monthlyPaymentMode).toBe('boolean');
      expect(Array.isArray(profileResponse.body.addresses)).toBe(true);
    });

    it('should handle both /users and /customers endpoints for backward compatibility', async () => {
      // Test new customer endpoint
      const customerResponse = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Test legacy user endpoint (if it exists)
      const userResponse = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      // Both should work or user endpoint should return appropriate response
      expect([200, 404]).toContain(userResponse.status);

      if (userResponse.status === 200) {
        // If both exist, they should return similar data
        expect(customerResponse.body.phone).toBe(userResponse.body.phone);
        expect(customerResponse.body.role).toBe(userResponse.body.role);
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid authentication gracefully', async () => {
      await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should validate request data properly', async () => {
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: 'not-a-boolean' })
        .expect(400);
    });

    it('should handle missing request body', async () => {
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Performance and Load', () => {
    it('should handle multiple rapid requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/customers/me')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testCustomerId);
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('Data Persistence', () => {
    it('should persist changes across requests', async () => {
      // Enable monthly payment mode
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: true })
        .expect(200);

      // Wait a moment to ensure persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify persistence in multiple requests
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .get('/customers/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.monthlyPaymentMode).toBe(true);
      }

      // Reset for cleanup
      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monthlyPaymentMode: false })
        .expect(200);
    });
  });

  describe('API Documentation Compliance', () => {
    it('should return responses matching Swagger documentation', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify response matches expected CustomerProfileDto structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        phone: expect.stringMatching(/^\+91[6-9]\d{9}$/),
        role: expect.stringMatching(/^(customer|vendor|rider|admin)$/),
        walletBalance: expect.any(Number),
        isActive: expect.any(Boolean),
        monthlyPaymentMode: expect.any(Boolean),
        addresses: expect.any(Array),
        createdAt: expect.any(String),
      });
    });

    it('should return proper error responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/me')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Security Compliance', () => {
    it('should require authentication for all customer endpoints', async () => {
      await request(app.getHttpServer())
        .get('/customers/me')
        .expect(401);

      await request(app.getHttpServer())
        .put('/customers/monthly-payment-mode')
        .send({ monthlyPaymentMode: true })
        .expect(401);
    });

    it('should not expose sensitive information', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Ensure no sensitive fields are exposed
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('otpCode');
      expect(response.body).not.toHaveProperty('otpExpiry');
      expect(response.body).not.toHaveProperty('_id');
      expect(response.body).not.toHaveProperty('__v');
    });
  });
});
