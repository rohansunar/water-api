import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { RiderController } from '../../src/rider/rider.controller';
import { RiderService } from '../../src/rider/rider.service';
import { UserFactory } from '../factories/user.factory.spec';
import { TestHelper, PerformanceTestHelper } from '../utils/test-helpers.spec';

describe('Rider Performance Tests', () => {
  let app: INestApplication;
  let riderService: RiderService;
  let testUser: any;
  let testToken: string;
  let createdRider: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RiderController],
      providers: [
        {
          provide: RiderService,
          useValue: {
            create: jest.fn(),
            findByUserId: jest.fn(),
            getRiderOrders: jest.fn(),
            updateOrderStatus: jest.fn(),
            updateLocation: jest.fn(),
            getRiderProfile: jest.fn(),
            updateAvailability: jest.fn(),
            getEarningsHistory: jest.fn(),
            getEarningsSummary: jest.fn(),
            requestWithdrawal: jest.fn(),
            getDeliveryHistory: jest.fn(),
            getDeliveryStats: jest.fn(),
            getUpcomingDeliveries: jest.fn(),
            getOptimizedRoute: jest.fn(),
            setRoutePreferences: jest.fn(),
            getPerformanceMetrics: jest.fn(),
            getRiderRating: jest.fn(),
            getLeaderboardPosition: jest.fn(),
            getPerformanceGoals: jest.fn(),
            getSchedule: jest.fn(),
            createScheduleSlot: jest.fn(),
            getAvailabilityStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    riderService = moduleFixture.get<RiderService>(RiderService);
    await app.init();

    // Create test user and token
    testUser = UserFactory.createRider();
    testToken = TestHelper.generateTestToken({ sub: testUser.id, role: 'delivery_rider' });

    // Mock rider creation
    createdRider = {
      id: 'test-rider-123',
      userId: testUser.id,
      name: 'Test Rider',
      phone: '+919876543210',
      vehicleType: 'bike',
      vehicleNumber: 'DL01CA1234',
      isActive: true,
      isAvailable: true,
      rating: 4.5,
      totalDeliveries: 150,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(riderService, 'findByUserId').mockResolvedValue(createdRider);
    jest.spyOn(riderService, 'create').mockResolvedValue(createdRider);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('API Endpoint Performance', () => {
    it('should handle GET /riders/profile within 100ms', async () => {
      const { result, averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          return request(app.getHttpServer())
            .get('/riders/profile')
            .set('Authorization', `Bearer ${testToken}`);
        },
        10
      );

      PerformanceTestHelper.assertPerformance(averageTime, 100, 'GET /riders/profile');
      expect(result.status).toBe(200);
    });

    it('should handle GET /riders/orders within 200ms', async () => {
      const mockOrders = Array.from({ length: 20 }, (_, i) => ({
        id: `order-${i}`,
        userId: 'customer-1',
        vendorId: 'vendor-1',
        productId: 'product-1',
        quantity: 2,
        totalAmount: 200,
        status: 'assigned',
        schedule: 'immediate',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          latitude: 28.6139,
          longitude: 77.2090,
          contactPhone: '+919876543210',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      jest.spyOn(riderService, 'getRiderOrders').mockResolvedValue(mockOrders);

      const { result, averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          return request(app.getHttpServer())
            .get('/riders/orders')
            .set('Authorization', `Bearer ${testToken}`);
        },
        10
      );

      PerformanceTestHelper.assertPerformance(averageTime, 200, 'GET /riders/orders');
      expect(result.status).toBe(200);
    });

    it('should handle POST /riders/location within 50ms', async () => {
      const { result, averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          return request(app.getHttpServer())
            .post('/riders/location')
            .set('Authorization', `Bearer ${testToken}`)
            .send({
              latitude: 28.6139,
              longitude: 77.2090,
            });
        },
        10
      );

      PerformanceTestHelper.assertPerformance(averageTime, 50, 'POST /riders/location');
      expect(result.status).toBe(200);
    });

    it('should handle PUT /riders/availability within 50ms', async () => {
      const { result, averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          return request(app.getHttpServer())
            .put('/riders/availability')
            .set('Authorization', `Bearer ${testToken}`)
            .send({ isAvailable: true });
        },
        10
      );

      PerformanceTestHelper.assertPerformance(averageTime, 50, 'PUT /riders/availability');
      expect(result.status).toBe(200);
    });

    it('should handle GET /riders/earnings within 150ms', async () => {
      const mockEarningsResponse = {
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `earning-${i}`,
          orderId: `order-${i}`,
          amount: 50.00,
          type: 'delivery_fee',
          status: 'completed',
          earnedAt: new Date('2024-01-15T10:30:00Z'),
          description: 'Delivery completed successfully',
        })),
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      };

      jest.spyOn(riderService, 'getEarningsHistory').mockResolvedValue(mockEarningsResponse);

      const { result, averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          return request(app.getHttpServer())
            .get('/riders/earnings?page=1&limit=10')
            .set('Authorization', `Bearer ${testToken}`);
        },
        10
      );

      PerformanceTestHelper.assertPerformance(averageTime, 150, 'GET /riders/earnings');
      expect(result.status).toBe(200);
    });

    it('should handle GET /riders/performance within 100ms', async () => {
      const mockMetrics = {
        overallScore: 4.7,
        completionRate: 98.5,
        onTimeRate: 92.0,
        averageRating: 4.6,
        monthlyEarnings: 12500.00,
        period: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-31T23:59:59Z'),
        },
      };

      jest.spyOn(riderService, 'getPerformanceMetrics').mockResolvedValue(mockMetrics);

      const { result, averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          return request(app.getHttpServer())
            .get('/riders/performance')
            .set('Authorization', `Bearer ${testToken}`);
        },
        10
      );

      PerformanceTestHelper.assertPerformance(averageTime, 100, 'GET /riders/performance');
      expect(result.status).toBe(200);
    });
  });

  describe('Service Method Performance', () => {
    it('should handle getRiderOrders within 50ms', async () => {
      const mockOrders = Array.from({ length: 10 }, (_, i) => ({
        id: `order-${i}`,
        userId: 'customer-1',
        vendorId: 'vendor-1',
        productId: 'product-1',
        quantity: 2,
        totalAmount: 200,
        status: 'assigned',
        schedule: 'immediate',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          latitude: 28.6139,
          longitude: 77.2090,
          contactPhone: '+919876543210',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      jest.spyOn(riderService, 'getRiderOrders').mockResolvedValue(mockOrders);

      const { averageTime } = await PerformanceTestHelper.measureExecutionTime(
        () => riderService.getRiderOrders(testUser.id),
        20
      );

      PerformanceTestHelper.assertPerformance(averageTime, 50, 'getRiderOrders service method');
    });

    it('should handle getEarningsHistory within 100ms', async () => {
      const mockEarningsResponse = {
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `earning-${i}`,
          orderId: `order-${i}`,
          amount: 50.00,
          type: 'delivery_fee',
          status: 'completed',
          earnedAt: new Date('2024-01-15T10:30:00Z'),
          description: 'Delivery completed successfully',
        })),
        total: 100,
        page: 1,
        limit: 10,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      };

      jest.spyOn(riderService, 'getEarningsHistory').mockResolvedValue(mockEarningsResponse);

      const { averageTime } = await PerformanceTestHelper.measureExecutionTime(
        () => riderService.getEarningsHistory(testUser.id, { page: 1, limit: 10 }),
        20
      );

      PerformanceTestHelper.assertPerformance(averageTime, 100, 'getEarningsHistory service method');
    });

    it('should handle getPerformanceMetrics within 30ms', async () => {
      const mockMetrics = {
        overallScore: 4.7,
        completionRate: 98.5,
        onTimeRate: 92.0,
        averageRating: 4.6,
        monthlyEarnings: 12500.00,
        period: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-31T23:59:59Z'),
        },
      };

      jest.spyOn(riderService, 'getPerformanceMetrics').mockResolvedValue(mockMetrics);

      const { averageTime } = await PerformanceTestHelper.measureExecutionTime(
        () => riderService.getPerformanceMetrics(testUser.id),
        20
      );

      PerformanceTestHelper.assertPerformance(averageTime, 30, 'getPerformanceMetrics service method');
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 10 concurrent requests within 500ms', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          userId: 'customer-1',
          vendorId: 'vendor-1',
          productId: 'product-1',
          quantity: 2,
          totalAmount: 200,
          status: 'assigned',
          schedule: 'immediate',
          paymentMethod: 'wallet',
          paymentStatus: 'paid',
          deliveryAddress: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456',
            latitude: 28.6139,
            longitude: 77.2090,
            contactPhone: '+919876543210',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(riderService, 'getRiderOrders').mockResolvedValue(mockOrders);

      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .get('/riders/orders')
          .set('Authorization', `Bearer ${testToken}`)
      );

      const { averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          const responses = await Promise.all(concurrentRequests);
          return responses;
        },
        5
      );

      PerformanceTestHelper.assertPerformance(averageTime, 500, '10 concurrent requests');
    });

    it('should handle mixed concurrent operations', async () => {
      const operations = [
        request(app.getHttpServer()).get('/riders/profile').set('Authorization', `Bearer ${testToken}`),
        request(app.getHttpServer()).get('/riders/orders').set('Authorization', `Bearer ${testToken}`),
        request(app.getHttpServer()).get('/riders/earnings').set('Authorization', `Bearer ${testToken}`),
        request(app.getHttpServer()).get('/riders/performance').set('Authorization', `Bearer ${testToken}`),
        request(app.getHttpServer()).post('/riders/location').set('Authorization', `Bearer ${testToken}`).send({
          latitude: 28.6139,
          longitude: 77.2090,
        }),
      ];

      const { averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          const responses = await Promise.all(operations);
          return responses;
        },
        5
      );

      PerformanceTestHelper.assertPerformance(averageTime, 300, 'mixed concurrent operations');
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform intensive operations
      for (let i = 0; i < 100; i++) {
        await riderService.getRiderOrders(testUser.id);
        await riderService.getEarningsHistory(testUser.id, { page: 1, limit: 10 });
        await riderService.getPerformanceMetrics(testUser.id);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex queries efficiently', async () => {
      // Mock complex query with multiple joins and aggregations
      const mockComplexResult = {
        totalEarnings: 1250.50,
        totalDeliveries: 25,
        averagePerDelivery: 50.00,
        totalTips: 150.00,
        totalBonuses: 100.00,
        pendingWithdrawal: 800.00,
        dateRange: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-31T23:59:59Z'),
        },
      };

      jest.spyOn(riderService, 'getEarningsSummary').mockResolvedValue(mockComplexResult);

      const { averageTime } = await PerformanceTestHelper.measureExecutionTime(
        () => riderService.getEarningsSummary(testUser.id),
        20
      );

      // Complex queries should complete within 200ms
      PerformanceTestHelper.assertPerformance(averageTime, 200, 'complex database queries');
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors quickly', async () => {
      jest.spyOn(riderService, 'findByUserId').mockResolvedValue(null);

      const { averageTime } = await PerformanceTestHelper.measureExecutionTime(
        async () => {
          return request(app.getHttpServer())
            .get('/riders/profile')
            .set('Authorization', `Bearer ${testToken}`);
        },
        10
      );

      // Error responses should be fast (within 50ms)
      PerformanceTestHelper.assertPerformance(averageTime, 50, 'error handling');
    });
  });
});