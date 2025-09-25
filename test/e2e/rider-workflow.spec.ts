import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { RiderController } from '../../src/rider/rider.controller';
import { RiderService } from '../../src/rider/rider.service';
import { UserFactory } from '../factories/user.factory.spec';
import { TestHelper } from '../utils/test-helpers.spec';

describe('Rider E2E Workflow Tests', () => {
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

  describe('Complete Rider Onboarding Workflow', () => {
    it('should complete rider onboarding process', async () => {
      // Step 1: Create rider profile
      const createResponse = await request(app.getHttpServer())
        .post('/riders/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Rider',
          phone: '+919876543210',
          vehicleType: 'bike',
          vehicleNumber: 'DL01CA1234',
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body).toHaveProperty('userId', testUser.id);
      expect(createResponse.body).toHaveProperty('name', 'Test Rider');
      expect(createResponse.body).toHaveProperty('vehicleType', 'bike');
      expect(createResponse.body).toHaveProperty('isActive', true);
      expect(createResponse.body).toHaveProperty('isAvailable', true);

      // Step 2: Update availability
      const availabilityResponse = await request(app.getHttpServer())
        .put('/riders/availability')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ isAvailable: true })
        .expect(200);

      expect(availabilityResponse.body).toHaveProperty('isAvailable', true);

      // Step 3: Update location
      const locationResponse = await request(app.getHttpServer())
        .post('/riders/location')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          latitude: 28.6139,
          longitude: 77.2090,
        })
        .expect(200);

      expect(locationResponse.body).toHaveProperty('message', 'Location updated successfully');
      expect(locationResponse.body.location).toHaveProperty('latitude', 28.6139);
      expect(locationResponse.body.location).toHaveProperty('longitude', 77.2090);
    });
  });

  describe('Order Management Workflow', () => {
    it('should handle complete order lifecycle', async () => {
      // Mock order data
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

      // Step 1: Get assigned orders
      const ordersResponse = await request(app.getHttpServer())
        .get('/riders/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(ordersResponse.body)).toBe(true);
      expect(ordersResponse.body.length).toBeGreaterThan(0);
      const order = ordersResponse.body[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('status', 'assigned');

      // Step 2: Update order status to picked up
      const updatedOrder = { ...order, status: 'picked_up' };
      jest.spyOn(riderService, 'updateOrderStatus').mockResolvedValue(updatedOrder);

      const statusResponse = await request(app.getHttpServer())
        .put(`/riders/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'picked_up' })
        .expect(200);

      expect(statusResponse.body).toHaveProperty('status', 'picked_up');

      // Step 3: Update order status to in transit
      const inTransitOrder = { ...order, status: 'in_transit' };
      jest.spyOn(riderService, 'updateOrderStatus').mockResolvedValue(inTransitOrder);

      const transitResponse = await request(app.getHttpServer())
        .put(`/riders/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'in_transit' })
        .expect(200);

      expect(transitResponse.body).toHaveProperty('status', 'in_transit');

      // Step 4: Complete delivery
      const deliveredOrder = { ...order, status: 'delivered' };
      jest.spyOn(riderService, 'updateOrderStatus').mockResolvedValue(deliveredOrder);

      const deliveryResponse = await request(app.getHttpServer())
        .put(`/riders/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'delivered' })
        .expect(200);

      expect(deliveryResponse.body).toHaveProperty('status', 'delivered');
    });
  });

  describe('Earnings Management Workflow', () => {
    it('should handle complete earnings workflow', async () => {
      // Mock earnings data
      const mockEarningsResponse = {
        data: [
          {
            id: 'earning-1',
            orderId: 'order-1',
            amount: 50.00,
            type: 'delivery_fee',
            status: 'completed',
            earnedAt: new Date('2024-01-15T10:30:00Z'),
            description: 'Delivery completed successfully',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      const mockEarningsSummary = {
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

      jest.spyOn(riderService, 'getEarningsHistory').mockResolvedValue(mockEarningsResponse);
      jest.spyOn(riderService, 'getEarningsSummary').mockResolvedValue(mockEarningsSummary);

      // Step 1: Get earnings history
      const historyResponse = await request(app.getHttpServer())
        .get('/riders/earnings?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveProperty('data');
      expect(historyResponse.body).toHaveProperty('total');
      expect(Array.isArray(historyResponse.body.data)).toBe(true);

      // Step 2: Get earnings summary
      const summaryResponse = await request(app.getHttpServer())
        .get('/riders/earnings/summary')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(summaryResponse.body).toHaveProperty('totalEarnings');
      expect(summaryResponse.body).toHaveProperty('totalDeliveries');
      expect(summaryResponse.body).toHaveProperty('averagePerDelivery');
      expect(summaryResponse.body).toHaveProperty('dateRange');

      // Step 3: Request withdrawal
      const mockWithdrawal = {
        id: 'withdrawal-123',
        amount: 500.00,
        status: 'pending',
        bankAccountNumber: '****5678',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test Rider',
        requestedAt: new Date(),
      };

      jest.spyOn(riderService, 'requestWithdrawal').mockResolvedValue(mockWithdrawal);

      const withdrawalResponse = await request(app.getHttpServer())
        .post('/riders/earnings/withdraw')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 500.00,
          bankAccountNumber: '123456789012',
          ifscCode: 'HDFC0001234',
          accountHolderName: 'Test Rider',
        })
        .expect(201);

      expect(withdrawalResponse.body).toHaveProperty('id');
      expect(withdrawalResponse.body).toHaveProperty('amount', 500.00);
      expect(withdrawalResponse.body).toHaveProperty('status', 'pending');
    });
  });

  describe('Performance Tracking Workflow', () => {
    it('should handle complete performance tracking workflow', async () => {
      // Mock performance data
      const mockPerformanceMetrics = {
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

      const mockRiderRating = {
        averageRating: 4.6,
        totalRatings: 150,
        ratingDistribution: {
          5: 120,
          4: 25,
          3: 4,
          2: 1,
          1: 0,
        },
        recentRatings: [
          {
            rating: 5,
            comment: 'Excellent service!',
            customerName: 'Amit S.',
            date: new Date('2024-01-15T10:30:00Z'),
          },
        ],
      };

      const mockLeaderboard = {
        currentRank: 15,
        totalRiders: 250,
        score: 4.7,
        topPerformers: [
          {
            rank: 1,
            name: 'Rider A',
            score: 4.9,
            deliveries: 180,
          },
        ],
        nearbyRiders: [
          {
            rank: 14,
            name: 'Rider X',
            score: 4.71,
          },
        ],
      };

      const mockPerformanceGoals = {
        monthlyDeliveries: 200,
        currentDeliveries: 150,
        monthlyEarnings: 15000.00,
        currentEarnings: 11250.00,
        targetRating: 4.5,
        currentRating: 4.6,
        daysRemaining: 10,
      };

      jest.spyOn(riderService, 'getPerformanceMetrics').mockResolvedValue(mockPerformanceMetrics);
      jest.spyOn(riderService, 'getRiderRating').mockResolvedValue(mockRiderRating);
      jest.spyOn(riderService, 'getLeaderboardPosition').mockResolvedValue(mockLeaderboard);
      jest.spyOn(riderService, 'getPerformanceGoals').mockResolvedValue(mockPerformanceGoals);

      // Step 1: Get performance metrics
      const metricsResponse = await request(app.getHttpServer())
        .get('/riders/performance')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(metricsResponse.body).toHaveProperty('overallScore');
      expect(metricsResponse.body).toHaveProperty('completionRate');
      expect(metricsResponse.body).toHaveProperty('onTimeRate');
      expect(metricsResponse.body).toHaveProperty('averageRating');
      expect(metricsResponse.body).toHaveProperty('monthlyEarnings');

      // Step 2: Get rider rating details
      const ratingResponse = await request(app.getHttpServer())
        .get('/riders/performance/rating')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(ratingResponse.body).toHaveProperty('averageRating');
      expect(ratingResponse.body).toHaveProperty('totalRatings');
      expect(ratingResponse.body).toHaveProperty('ratingDistribution');
      expect(ratingResponse.body).toHaveProperty('recentRatings');
      expect(Array.isArray(ratingResponse.body.recentRatings)).toBe(true);

      // Step 3: Get leaderboard position
      const leaderboardResponse = await request(app.getHttpServer())
        .get('/riders/performance/leaderboard')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(leaderboardResponse.body).toHaveProperty('currentRank');
      expect(leaderboardResponse.body).toHaveProperty('totalRiders');
      expect(leaderboardResponse.body).toHaveProperty('score');
      expect(leaderboardResponse.body).toHaveProperty('topPerformers');
      expect(leaderboardResponse.body).toHaveProperty('nearbyRiders');

      // Step 4: Get performance goals
      const goalsResponse = await request(app.getHttpServer())
        .get('/riders/performance/goals')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(goalsResponse.body).toHaveProperty('monthlyDeliveries');
      expect(goalsResponse.body).toHaveProperty('currentDeliveries');
      expect(goalsResponse.body).toHaveProperty('monthlyEarnings');
      expect(goalsResponse.body).toHaveProperty('currentEarnings');
      expect(goalsResponse.body).toHaveProperty('targetRating');
      expect(goalsResponse.body).toHaveProperty('currentRating');
      expect(goalsResponse.body).toHaveProperty('daysRemaining');
    });
  });

  describe('Schedule Management Workflow', () => {
    it('should handle complete schedule management workflow', async () => {
      // Mock schedule data
      const mockSchedule = [
        {
          id: 'schedule-1',
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T18:00:00Z'),
          dayOfWeek: 'monday',
          isActive: true,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      const mockAvailabilityStatus = {
        isAvailable: true,
        currentSlot: {
          id: 'current-slot',
          startTime: new Date(Date.now() - 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
          dayOfWeek: 'monday',
        },
        nextSlot: undefined,
      };

      jest.spyOn(riderService, 'getSchedule').mockResolvedValue(mockSchedule);
      jest.spyOn(riderService, 'getAvailabilityStatus').mockResolvedValue(mockAvailabilityStatus);

      // Step 1: Get current schedule
      const scheduleResponse = await request(app.getHttpServer())
        .get('/riders/schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(scheduleResponse.body)).toBe(true);
      if (scheduleResponse.body.length > 0) {
        const slot = scheduleResponse.body[0];
        expect(slot).toHaveProperty('id');
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('dayOfWeek');
        expect(slot).toHaveProperty('isActive');
      }

      // Step 2: Get availability status
      const availabilityResponse = await request(app.getHttpServer())
        .get('/riders/schedule/availability')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(availabilityResponse.body).toHaveProperty('isAvailable');
      expect(availabilityResponse.body).toHaveProperty('currentSlot');
      expect(availabilityResponse.body.currentSlot).toHaveProperty('id');
      expect(availabilityResponse.body.currentSlot).toHaveProperty('startTime');
      expect(availabilityResponse.body.currentSlot).toHaveProperty('endTime');
      expect(availabilityResponse.body.currentSlot).toHaveProperty('dayOfWeek');
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle authentication errors', async () => {
      // No token
      await request(app.getHttpServer())
        .get('/riders/profile')
        .expect(401);

      // Invalid token
      await request(app.getHttpServer())
        .get('/riders/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Wrong role
      const customerToken = TestHelper.generateTestToken({ sub: 'customer-id', role: 'customer' });
      await request(app.getHttpServer())
        .get('/riders/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should handle validation errors', async () => {
      // Invalid location coordinates
      await request(app.getHttpServer())
        .post('/riders/location')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          latitude: -91, // Invalid latitude
          longitude: 77.2090,
        })
        .expect(400);

      // Invalid availability value
      await request(app.getHttpServer())
        .put('/riders/availability')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          isAvailable: 'invalid', // Should be boolean
        })
        .expect(400);

      // Invalid withdrawal amount
      await request(app.getHttpServer())
        .post('/riders/earnings/withdraw')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 50, // Less than minimum
          bankAccountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
          accountHolderName: 'Test Rider',
        })
        .expect(400);
    });

    it('should handle resource not found errors', async () => {
      // Non-existent rider
      jest.spyOn(riderService, 'findByUserId').mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/riders/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      // Reset mock
      jest.spyOn(riderService, 'findByUserId').mockResolvedValue(createdRider);
    });
  });

  describe('Data Consistency Workflow', () => {
    it('should maintain data consistency across multiple operations', async () => {
      // Perform multiple operations in sequence
      const operations = [
        // Update availability
        request(app.getHttpServer())
          .put('/riders/availability')
          .set('Authorization', `Bearer ${testToken}`)
          .send({ isAvailable: true }),

        // Update location
        request(app.getHttpServer())
          .post('/riders/location')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            latitude: 28.6139,
            longitude: 77.2090,
          }),

        // Get profile to verify changes
        request(app.getHttpServer())
          .get('/riders/profile')
          .set('Authorization', `Bearer ${testToken}`),
      ];

      // Execute operations sequentially
      for (const operation of operations) {
        await operation;
      }

      // Verify final state consistency
      const finalProfileResponse = await request(app.getHttpServer())
        .get('/riders/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(finalProfileResponse.body).toHaveProperty('isAvailable', true);
      expect(finalProfileResponse.body).toHaveProperty('currentLocation');
      expect(finalProfileResponse.body.currentLocation).toHaveProperty('latitude', 28.6139);
      expect(finalProfileResponse.body.currentLocation).toHaveProperty('longitude', 77.2090);
    });
  });
});