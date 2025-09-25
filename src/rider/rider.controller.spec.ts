import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';
import { UserFactory } from '../../test/factories/user.factory.spec';
import { TestHelper } from '../../test/utils/test-helpers.spec';

describe('RiderController (e2e)', () => {
  let app: INestApplication;
  let riderService: RiderService;
  let testUser: any;
  let testToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RiderController],
      providers: [
        {
          provide: RiderService,
          useValue: {
            getRiderOrders: jest.fn(),
            updateOrderStatus: jest.fn(),
            updateLocation: jest.fn(),
            getRiderProfile: jest.fn(),
            updateAvailability: jest.fn(),
            getEarningsHistory: jest.fn(),
            getEarningsSummary: jest.fn(),
            getEarningDetails: jest.fn(),
            requestWithdrawal: jest.fn(),
            getWithdrawalHistory: jest.fn(),
            getDeliveryHistory: jest.fn(),
            getDeliveryDetails: jest.fn(),
            getDeliveryStats: jest.fn(),
            rateDelivery: jest.fn(),
            getUpcomingDeliveries: jest.fn(),
            getOptimizedRoute: jest.fn(),
            setRoutePreferences: jest.fn(),
            getRouteHistory: jest.fn(),
            completeRoute: jest.fn(),
            getPerformanceMetrics: jest.fn(),
            getRiderRating: jest.fn(),
            getLeaderboardPosition: jest.fn(),
            getPerformanceGoals: jest.fn(),
            getSchedule: jest.fn(),
            createScheduleSlot: jest.fn(),
            updateScheduleSlot: jest.fn(),
            deleteScheduleSlot: jest.fn(),
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /riders/orders', () => {
    it('should return rider orders successfully', async () => {
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

      const response = await request(app.getHttpServer())
        .get('/riders/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('deliveryAddress');
    });

    it('should return 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/riders/orders')
        .expect(401);
    });

    it('should return 403 when user is not a delivery rider', async () => {
      const customerToken = TestHelper.generateTestToken({ sub: 'customer-id', role: 'customer' });

      await request(app.getHttpServer())
        .get('/riders/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('PUT /riders/orders/:orderId/status', () => {
    it('should update order status successfully', async () => {
      const mockUpdatedOrder = {
        id: 'order-123',
        userId: 'customer-1',
        vendorId: 'vendor-1',
        productId: 'product-1',
        quantity: 1,
        totalAmount: 100,
        status: 'picked_up',
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
      };

      jest.spyOn(riderService, 'updateOrderStatus').mockResolvedValue(mockUpdatedOrder);

      const updateDto = { status: 'picked_up' };
      const response = await request(app.getHttpServer())
        .put('/riders/orders/order-123/status')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'order-123');
      expect(response.body).toHaveProperty('status', 'picked_up');
      expect(response.body).toHaveProperty('deliveryAddress');
    });

    it('should return 400 for invalid status', async () => {
      const updateDto = { status: 'invalid-status' };
      await request(app.getHttpServer())
        .put('/riders/orders/order-123/status')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateDto)
        .expect(400);
    });

    it('should return 404 when order not found', async () => {
      jest.spyOn(riderService, 'updateOrderStatus').mockImplementation(() => {
        throw new Error('Order not found');
      });

      const updateDto = { status: 'picked_up' };
      await request(app.getHttpServer())
        .put('/riders/orders/non-existent-order/status')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('POST /riders/location', () => {
    it('should update rider location successfully', async () => {
      const mockResponse = {
        message: 'Location updated successfully',
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
          updatedAt: new Date(),
        },
      };

      jest.spyOn(riderService, 'updateLocation').mockResolvedValue(mockResponse);

      const locationDto = {
        latitude: 28.6139,
        longitude: 77.2090,
      };

      const response = await request(app.getHttpServer())
        .post('/riders/location')
        .set('Authorization', `Bearer ${testToken}`)
        .send(locationDto)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Location updated successfully');
      expect(response.body).toHaveProperty('location');
      expect(response.body.location).toHaveProperty('latitude', 28.6139);
      expect(response.body.location).toHaveProperty('longitude', 77.2090);
    });

    it('should return 400 for invalid coordinates', async () => {
      const locationDto = {
        latitude: -91, // Invalid latitude
        longitude: 77.2090,
      };

      await request(app.getHttpServer())
        .post('/riders/location')
        .set('Authorization', `Bearer ${testToken}`)
        .send(locationDto)
        .expect(400);
    });
  });

  describe('GET /riders/profile', () => {
    it('should return rider profile successfully', async () => {
      const mockProfile = {
        id: 'rider-123',
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

      jest.spyOn(riderService, 'getRiderProfile').mockResolvedValue(mockProfile);

      const response = await request(app.getHttpServer())
        .get('/riders/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'rider-123');
      expect(response.body).toHaveProperty('userId', testUser.id);
      expect(response.body).toHaveProperty('name', 'Test Rider');
      expect(response.body).toHaveProperty('phone');
      expect(response.body).toHaveProperty('vehicleType');
      expect(response.body).toHaveProperty('vehicleNumber');
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('isAvailable', true);
      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('totalDeliveries');
    });
  });

  describe('PUT /riders/availability', () => {
    it('should update availability successfully', async () => {
      const mockProfile = {
        id: 'rider-123',
        userId: testUser.id,
        name: 'Test Rider',
        phone: '+919876543210',
        vehicleType: 'bike',
        vehicleNumber: 'DL01CA1234',
        isActive: true,
        isAvailable: false, // Updated to false
        rating: 4.5,
        totalDeliveries: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(riderService, 'updateAvailability').mockResolvedValue(mockProfile);

      const availabilityDto = { isAvailable: false };
      const response = await request(app.getHttpServer())
        .put('/riders/availability')
        .set('Authorization', `Bearer ${testToken}`)
        .send(availabilityDto)
        .expect(200);

      expect(response.body).toHaveProperty('isAvailable', false);
      expect(response.body).toHaveProperty('id', 'rider-123');
    });

    it('should return 400 for invalid availability value', async () => {
      const availabilityDto = { isAvailable: 'invalid' as any };
      await request(app.getHttpServer())
        .put('/riders/availability')
        .set('Authorization', `Bearer ${testToken}`)
        .send(availabilityDto)
        .expect(400);
    });
  });

  describe('GET /riders/earnings', () => {
    it('should return earnings history with pagination', async () => {
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

      jest.spyOn(riderService, 'getEarningsHistory').mockResolvedValue(mockEarningsResponse);

      const response = await request(app.getHttpServer())
        .get('/riders/earnings?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('hasNext');
      expect(response.body).toHaveProperty('hasPrev');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /riders/earnings/summary', () => {
    it('should return earnings summary', async () => {
      const mockSummary = {
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

      jest.spyOn(riderService, 'getEarningsSummary').mockResolvedValue(mockSummary);

      const response = await request(app.getHttpServer())
        .get('/riders/earnings/summary')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalEarnings');
      expect(response.body).toHaveProperty('totalDeliveries');
      expect(response.body).toHaveProperty('averagePerDelivery');
      expect(response.body).toHaveProperty('totalTips');
      expect(response.body).toHaveProperty('totalBonuses');
      expect(response.body).toHaveProperty('pendingWithdrawal');
      expect(response.body).toHaveProperty('dateRange');
    });
  });

  describe('GET /riders/earnings/:id', () => {
    it('should return earning details', async () => {
      const mockEarning = {
        id: 'earning-123',
        orderId: 'order-123',
        amount: 50.00,
        type: 'delivery_fee',
        status: 'completed',
        earnedAt: new Date('2024-01-15T10:30:00Z'),
        description: 'Delivery completed successfully',
      };

      jest.spyOn(riderService, 'getEarningDetails').mockResolvedValue(mockEarning);

      const response = await request(app.getHttpServer())
        .get('/riders/earnings/earning-123')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'earning-123');
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('earnedAt');
      expect(response.body).toHaveProperty('description');
    });
  });

  describe('POST /riders/earnings/withdraw', () => {
    it('should create withdrawal request successfully', async () => {
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

      const withdrawalDto = {
        amount: 500.00,
        bankAccountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test Rider',
      };

      const response = await request(app.getHttpServer())
        .post('/riders/earnings/withdraw')
        .set('Authorization', `Bearer ${testToken}`)
        .send(withdrawalDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('amount', 500.00);
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('bankAccountNumber', '****5678');
      expect(response.body).toHaveProperty('ifscCode', 'HDFC0001234');
      expect(response.body).toHaveProperty('accountHolderName', 'Test Rider');
      expect(response.body).toHaveProperty('requestedAt');
    });

    it('should return 400 for withdrawal amount less than minimum', async () => {
      const withdrawalDto = {
        amount: 50.00, // Less than minimum 100
        bankAccountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test Rider',
      };

      await request(app.getHttpServer())
        .post('/riders/earnings/withdraw')
        .set('Authorization', `Bearer ${testToken}`)
        .send(withdrawalDto)
        .expect(400);
    });
  });

  describe('GET /riders/earnings/withdrawals', () => {
    it('should return withdrawal history', async () => {
      const mockWithdrawalsResponse = {
        data: [
          {
            id: 'withdrawal-1',
            amount: 500.00,
            status: 'completed',
            bankAccountNumber: '****5678',
            ifscCode: 'HDFC0001234',
            accountHolderName: 'Test Rider',
            transactionRef: 'TXN123456789',
            requestedAt: new Date('2024-01-10T10:00:00Z'),
            processedAt: new Date('2024-01-11T10:00:00Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      jest.spyOn(riderService, 'getWithdrawalHistory').mockResolvedValue(mockWithdrawalsResponse);

      const response = await request(app.getHttpServer())
        .get('/riders/earnings/withdrawals?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /riders/deliveries', () => {
    it('should return delivery history', async () => {
      const mockDeliveriesResponse = {
        data: [
          {
            id: 'delivery-1',
            orderId: 'order-1',
            customerName: 'Amit Sharma',
            customerPhone: '+919876543210',
            deliveryAddress: {
              street: '123 Main Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            },
            status: 'delivered',
            scheduledTime: new Date('2024-01-15T14:00:00Z'),
            completedAt: new Date('2024-01-15T13:45:00Z'),
            customerRating: 5,
            customerFeedback: 'Excellent service!',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      jest.spyOn(riderService, 'getDeliveryHistory').mockResolvedValue(mockDeliveriesResponse);

      const response = await request(app.getHttpServer())
        .get('/riders/deliveries?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /riders/deliveries/stats', () => {
    it('should return delivery statistics', async () => {
      const mockStats = {
        totalDeliveries: 150,
        thisMonthDeliveries: 25,
        averageDeliveryTime: 35,
        onTimeDeliveryRate: 92.5,
        averageRating: 4.7,
        totalDistance: 450.5,
      };

      jest.spyOn(riderService, 'getDeliveryStats').mockResolvedValue(mockStats);

      const response = await request(app.getHttpServer())
        .get('/riders/deliveries/stats')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalDeliveries');
      expect(response.body).toHaveProperty('thisMonthDeliveries');
      expect(response.body).toHaveProperty('averageDeliveryTime');
      expect(response.body).toHaveProperty('onTimeDeliveryRate');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('totalDistance');
    });
  });

  describe('GET /riders/deliveries/upcoming', () => {
    it('should return upcoming deliveries', async () => {
      const mockUpcomingDeliveries = [
        {
          id: 'upcoming-delivery-1',
          orderId: 'order-upcoming-1',
          customerName: 'Rajesh Kumar',
          customerPhone: '+919876543212',
          pickupAddress: {
            street: '789 Restaurant Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400003',
          },
          deliveryAddress: {
            street: '321 Customer Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400004',
          },
          scheduledPickupTime: new Date('2024-01-16T13:00:00Z'),
          scheduledDeliveryTime: new Date('2024-01-16T14:00:00Z'),
          orderItems: ['2x Chicken Burger', '1x French Fries'],
          specialInstructions: 'Call customer before delivery',
        },
      ];

      jest.spyOn(riderService, 'getUpcomingDeliveries').mockResolvedValue(mockUpcomingDeliveries);

      const response = await request(app.getHttpServer())
        .get('/riders/deliveries/upcoming')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const delivery = response.body[0];
        expect(delivery).toHaveProperty('id');
        expect(delivery).toHaveProperty('orderId');
        expect(delivery).toHaveProperty('customerName');
        expect(delivery).toHaveProperty('customerPhone');
        expect(delivery).toHaveProperty('pickupAddress');
        expect(delivery).toHaveProperty('deliveryAddress');
        expect(delivery).toHaveProperty('scheduledPickupTime');
        expect(delivery).toHaveProperty('scheduledDeliveryTime');
        expect(delivery).toHaveProperty('orderItems');
        expect(delivery).toHaveProperty('specialInstructions');
      }
    });
  });

  describe('GET /riders/routes/optimize', () => {
    it('should return optimized route', async () => {
      const mockRoute = {
        id: 'route-123',
        deliverySequence: [
          {
            orderId: 'order-1',
            sequence: 1,
            estimatedArrival: new Date('2024-01-16T13:30:00Z'),
            address: {
              street: '123 Main Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            },
          },
        ],
        totalDistance: 15.5,
        totalTime: 45,
        optimizedAt: new Date(),
      };

      jest.spyOn(riderService, 'getOptimizedRoute').mockResolvedValue(mockRoute);

      const response = await request(app.getHttpServer())
        .get('/riders/routes/optimize')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('deliverySequence');
      expect(response.body).toHaveProperty('totalDistance');
      expect(response.body).toHaveProperty('totalTime');
      expect(response.body).toHaveProperty('optimizedAt');
      expect(Array.isArray(response.body.deliverySequence)).toBe(true);
    });
  });

  describe('POST /riders/routes/preferences', () => {
    it('should set route preferences successfully', async () => {
      const preferencesDto = {
        maxDeliveryDistance: 10,
        preferredAreas: ['Andheri', 'Bandra'],
        avoidTolls: false,
        routeType: 'fastest' as 'fastest' | 'shortest' | 'scenic',
      };

      jest.spyOn(riderService, 'setRoutePreferences').mockResolvedValue(preferencesDto);

      const response = await request(app.getHttpServer())
        .post('/riders/routes/preferences')
        .set('Authorization', `Bearer ${testToken}`)
        .send(preferencesDto)
        .expect(200);

      expect(response.body).toHaveProperty('maxDeliveryDistance', 10);
      expect(response.body).toHaveProperty('preferredAreas');
      expect(response.body).toHaveProperty('avoidTolls', false);
      expect(response.body).toHaveProperty('routeType', 'fastest');
    });
  });

  describe('GET /riders/performance', () => {
    it('should return performance metrics', async () => {
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

      const response = await request(app.getHttpServer())
        .get('/riders/performance')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overallScore');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('onTimeRate');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('monthlyEarnings');
      expect(response.body).toHaveProperty('period');
    });
  });

  describe('GET /riders/performance/rating', () => {
    it('should return rider rating details', async () => {
      const mockRating = {
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

      jest.spyOn(riderService, 'getRiderRating').mockResolvedValue(mockRating);

      const response = await request(app.getHttpServer())
        .get('/riders/performance/rating')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('totalRatings');
      expect(response.body).toHaveProperty('ratingDistribution');
      expect(response.body).toHaveProperty('recentRatings');
      expect(Array.isArray(response.body.recentRatings)).toBe(true);
    });
  });

  describe('GET /riders/performance/leaderboard', () => {
    it('should return leaderboard position', async () => {
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

      jest.spyOn(riderService, 'getLeaderboardPosition').mockResolvedValue(mockLeaderboard);

      const response = await request(app.getHttpServer())
        .get('/riders/performance/leaderboard')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('currentRank');
      expect(response.body).toHaveProperty('totalRiders');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('topPerformers');
      expect(response.body).toHaveProperty('nearbyRiders');
      expect(Array.isArray(response.body.topPerformers)).toBe(true);
      expect(Array.isArray(response.body.nearbyRiders)).toBe(true);
    });
  });

  describe('GET /riders/performance/goals', () => {
    it('should return performance goals', async () => {
      const mockGoals = {
        monthlyDeliveries: 200,
        currentDeliveries: 150,
        monthlyEarnings: 15000.00,
        currentEarnings: 11250.00,
        targetRating: 4.5,
        currentRating: 4.6,
        daysRemaining: 10,
      };

      jest.spyOn(riderService, 'getPerformanceGoals').mockResolvedValue(mockGoals);

      const response = await request(app.getHttpServer())
        .get('/riders/performance/goals')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('monthlyDeliveries');
      expect(response.body).toHaveProperty('currentDeliveries');
      expect(response.body).toHaveProperty('monthlyEarnings');
      expect(response.body).toHaveProperty('currentEarnings');
      expect(response.body).toHaveProperty('targetRating');
      expect(response.body).toHaveProperty('currentRating');
      expect(response.body).toHaveProperty('daysRemaining');
    });
  });

  describe('GET /riders/schedule', () => {
    it('should return rider schedule', async () => {
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

      jest.spyOn(riderService, 'getSchedule').mockResolvedValue(mockSchedule);

      const response = await request(app.getHttpServer())
        .get('/riders/schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const slot = response.body[0];
        expect(slot).toHaveProperty('id');
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('dayOfWeek');
        expect(slot).toHaveProperty('isActive');
        expect(slot).toHaveProperty('createdAt');
      }
    });
  });

  describe('POST /riders/schedule', () => {
    it('should create schedule slot successfully', async () => {
      const mockSlot = {
        id: 'schedule-123',
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T18:00:00Z'),
        dayOfWeek: 'monday',
        isActive: true,
        createdAt: new Date(),
      };

      jest.spyOn(riderService, 'createScheduleSlot').mockResolvedValue(mockSlot);

      const scheduleDto = {
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T18:00:00Z',
        dayOfWeek: 'monday',
      };

      const response = await request(app.getHttpServer())
        .post('/riders/schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .send(scheduleDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('startTime');
      expect(response.body).toHaveProperty('endTime');
      expect(response.body).toHaveProperty('dayOfWeek', 'monday');
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('createdAt');
    });
  });

  describe('GET /riders/schedule/availability', () => {
    it('should return availability status', async () => {
      const mockStatus = {
        isAvailable: true,
        currentSlot: {
          id: 'current-slot',
          startTime: new Date(Date.now() - 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
          dayOfWeek: 'monday',
        },
        nextSlot: undefined,
      };

      jest.spyOn(riderService, 'getAvailabilityStatus').mockResolvedValue(mockStatus);

      const response = await request(app.getHttpServer())
        .get('/riders/schedule/availability')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isAvailable', true);
      expect(response.body).toHaveProperty('currentSlot');
      expect(response.body.currentSlot).toHaveProperty('id');
      expect(response.body.currentSlot).toHaveProperty('startTime');
      expect(response.body.currentSlot).toHaveProperty('endTime');
      expect(response.body.currentSlot).toHaveProperty('dayOfWeek');
      expect(response.body).not.toHaveProperty('nextSlot');
    });
  });
});