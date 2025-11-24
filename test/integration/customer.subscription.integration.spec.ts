import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { CustomerSubscriptionService } from '../../src/customer/services/customer.subscription.service';
import { CustomerService } from '../../src/customer/services/customer.service';
import { UserRole } from '../../src/common/interfaces/user.interface';

describe('Customer Subscription API Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let customerSubscriptionService: CustomerSubscriptionService;
  let customerService: CustomerService;
  let authToken: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get(PrismaService);
    jwtService = app.get(JwtService);
    customerSubscriptionService = app.get(CustomerSubscriptionService);
    customerService = app.get(CustomerService);

    // Clean up test data
    await prismaService.customer.deleteMany({
      where: { phone: { startsWith: '+91-test' } },
    });

    // Create test customer
    const testCustomer = await prismaService.customer.create({
      data: {
        phone: '+91-test-customer',
        role: 'CUSTOMER',
        isActive: true,
        walletBalance: 1000,
      },
    });
    testCustomerId = testCustomer.uuid;

    // Generate JWT token for test customer
    authToken = jwtService.sign({
      sub: testCustomerId,
      phone: '+91-test-customer',
      role: 'customer',
      type: 'customer',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.customer.deleteMany({
      where: { phone: { startsWith: '+91-test' } },
    });
    await app.close();
  });

  describe('GET /customers/subscriptions', () => {
    it('should return customer subscriptions successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Since service returns empty array, response should be empty
      expect(response.body).toEqual([]);
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app.getHttpServer())
        .get('/customers/subscriptions')
        .expect(401);
    });

    it('should return 401 when invalid auth token provided', async () => {
      await request(app.getHttpServer())
        .get('/customers/subscriptions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      const originalMethod =
        customerSubscriptionService.getCustomerSubscriptions;
      customerSubscriptionService.getCustomerSubscriptions = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await request(app.getHttpServer())
        .get('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      // Restore original method
      customerSubscriptionService.getCustomerSubscriptions = originalMethod;
    });
  });

  describe('POST /customers/subscriptions', () => {
    it('should create subscription successfully', async () => {
      const createSubscriptionDto = {
        product_id: 'prod-123',
        frequency: 'weekly',
        quantity: 2,
        start_date: '2024-01-01T00:00:00Z',
      };

      const response = await request(app.getHttpServer())
        .post('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createSubscriptionDto)
        .expect(201);

      expect(response.body).toEqual({});
    });

    it('should handle different subscription data', async () => {
      const createSubscriptionDto = {
        product_id: 'prod-456',
        frequency: 'daily',
        quantity: 1,
        start_date: '2024-01-01T00:00:00Z',
        special_instructions: 'Handle with care',
      };

      const response = await request(app.getHttpServer())
        .post('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createSubscriptionDto)
        .expect(201);

      expect(response.body).toEqual({});
    });

    it('should return 401 when no auth token provided', async () => {
      const createSubscriptionDto = {
        product_id: 'prod-123',
        frequency: 'weekly',
        quantity: 2,
        start_date: '2024-01-01T00:00:00Z',
      };

      await request(app.getHttpServer())
        .post('/customers/subscriptions')
        .send(createSubscriptionDto)
        .expect(401);
    });

    it('should handle service errors gracefully', async () => {
      const createSubscriptionDto = {
        product_id: 'prod-123',
        frequency: 'weekly',
        quantity: 2,
        start_date: '2024-01-01T00:00:00Z',
      };

      // Mock service to throw error
      const originalMethod = customerSubscriptionService.createSubscription;
      customerSubscriptionService.createSubscription = jest
        .fn()
        .mockRejectedValue(new Error('Validation failed'));

      await request(app.getHttpServer())
        .post('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createSubscriptionDto)
        .expect(500);

      // Restore original method
      customerSubscriptionService.createSubscription = originalMethod;
    });
  });

  describe('PUT /customers/subscriptions/:id', () => {
    it('should update subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const updateSubscriptionDto = {
        frequency: 'monthly',
        quantity: 3,
      };

      const response = await request(app.getHttpServer())
        .put(`/customers/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateSubscriptionDto)
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should handle status updates', async () => {
      const subscriptionId = 'sub-456';
      const updateSubscriptionDto = {
        status: 'paused',
      };

      const response = await request(app.getHttpServer())
        .put(`/customers/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateSubscriptionDto)
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should return 401 when no auth token provided', async () => {
      const subscriptionId = 'sub-123';
      const updateSubscriptionDto = {
        frequency: 'monthly',
        quantity: 3,
      };

      await request(app.getHttpServer())
        .put(`/customers/subscriptions/${subscriptionId}`)
        .send(updateSubscriptionDto)
        .expect(401);
    });

    it('should handle service errors gracefully', async () => {
      const subscriptionId = 'sub-123';
      const updateSubscriptionDto = {
        frequency: 'monthly',
        quantity: 3,
      };

      // Mock service to throw error
      const originalMethod = customerSubscriptionService.updateSubscription;
      customerSubscriptionService.updateSubscription = jest
        .fn()
        .mockRejectedValue(new Error('Subscription not found'));

      await request(app.getHttpServer())
        .put(`/customers/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateSubscriptionDto)
        .expect(500);

      // Restore original method
      customerSubscriptionService.updateSubscription = originalMethod;
    });
  });

  describe('DELETE /customers/subscriptions/:id', () => {
    it('should cancel subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const cancelSubscriptionDto = {
        reason: 'No longer needed',
      };

      const response = await request(app.getHttpServer())
        .delete(`/customers/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelSubscriptionDto)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Subscription cancelled successfully',
      });
    });

    it('should handle different cancellation reasons', async () => {
      const subscriptionId = 'sub-456';
      const reasons = [
        'Moving to different area',
        'Switching products',
        'Cost too high',
      ];

      for (const reason of reasons) {
        const cancelSubscriptionDto = { reason };

        const response = await request(app.getHttpServer())
          .delete(`/customers/subscriptions/${subscriptionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(cancelSubscriptionDto)
          .expect(200);

        expect(response.body).toEqual({
          message: 'Subscription cancelled successfully',
        });
      }
    });

    it('should return 401 when no auth token provided', async () => {
      const subscriptionId = 'sub-123';
      const cancelSubscriptionDto = {
        reason: 'No longer needed',
      };

      await request(app.getHttpServer())
        .delete(`/customers/subscriptions/${subscriptionId}`)
        .send(cancelSubscriptionDto)
        .expect(401);
    });

    it('should handle service errors gracefully', async () => {
      const subscriptionId = 'sub-123';
      const cancelSubscriptionDto = {
        reason: 'No longer needed',
      };

      // Mock service to throw error
      const originalMethod = customerSubscriptionService.cancelSubscription;
      customerSubscriptionService.cancelSubscription = jest
        .fn()
        .mockRejectedValue(new Error('Cancellation failed'));

      await request(app.getHttpServer())
        .delete(`/customers/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelSubscriptionDto)
        .expect(500);

      // Restore original method
      customerSubscriptionService.cancelSubscription = originalMethod;
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests with malformed JWT', async () => {
      await request(app.getHttpServer())
        .get('/customers/subscriptions')
        .set('Authorization', 'Bearer malformed.jwt.token')
        .expect(401);
    });

    it('should accept valid JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Request Validation', () => {
    it('should handle malformed request bodies gracefully', async () => {
      await request(app.getHttpServer())
        .post('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json')
        .expect(400);
    });

    it('should handle empty request bodies', async () => {
      await request(app.getHttpServer())
        .post('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201); // Service accepts any data currently
    });

    it('should handle invalid subscription IDs in URL parameters', async () => {
      await request(app.getHttpServer())
        .put('/customers/subscriptions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ frequency: 'weekly' })
        .expect(200); // Service accepts any ID currently
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', async () => {
      // Mock service to throw error
      const originalMethod =
        customerSubscriptionService.getCustomerSubscriptions;
      customerSubscriptionService.getCustomerSubscriptions = jest
        .fn()
        .mockRejectedValue(new Error('Test error'));

      const response = await request(app.getHttpServer())
        .get('/customers/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('statusCode', 500);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');

      // Restore original method
      customerSubscriptionService.getCustomerSubscriptions = originalMethod;
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      const promises = [
        request(app.getHttpServer())
          .get('/customers/subscriptions')
          .set('Authorization', `Bearer ${authToken}`),
        request(app.getHttpServer())
          .get('/customers/subscriptions')
          .set('Authorization', `Bearer ${authToken}`),
        request(app.getHttpServer())
          .get('/customers/subscriptions')
          .set('Authorization', `Bearer ${authToken}`),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });
});
