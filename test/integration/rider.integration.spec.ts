import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { RiderService } from '../../src/rider/rider.service';
import { UserFactory } from '../factories/user.factory.spec';
import { TestHelper } from '../utils/test-helpers.spec';

describe('Rider Integration Tests', () => {
  let app: INestApplication;
  let riderService: RiderService;
  let testUser: any;
  let testToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [RiderService],
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

  describe('Rider Profile Management', () => {
    it('should create rider profile and retrieve it', async () => {
      // Create rider profile
      const rider = await riderService.create(
        testUser.id,
        testUser.name || 'Test Rider',
        testUser.phone,
        'bike',
        'DL01CA1234'
      );

      expect(rider).toBeDefined();
      expect(rider.id).toBeDefined();
      expect(rider.userId).toBe(testUser.id);
      expect(rider.name).toBe(testUser.name);
      expect(rider.phone).toBe(testUser.phone);
      expect(rider.vehicleType).toBe('bike');
      expect(rider.vehicleNumber).toBe('DL01CA1234');
      expect(rider.isActive).toBe(true);
      expect(rider.isAvailable).toBe(true);

      // Retrieve rider profile
      const retrievedRider = await riderService.getRiderProfile(testUser.id);
      expect(retrievedRider).toEqual(rider);
    });

    it('should update rider availability', async () => {
      // Update availability to false
      const updatedRider = await riderService.updateAvailability(testUser.id, false);
      expect(updatedRider.isAvailable).toBe(false);

      // Verify the change persisted
      const retrievedRider = await riderService.getRiderProfile(testUser.id);
      expect(retrievedRider.isAvailable).toBe(false);

      // Update availability back to true
      const finalRider = await riderService.updateAvailability(testUser.id, true);
      expect(finalRider.isAvailable).toBe(true);
    });

    it('should update rider location', async () => {
      const locationDto = {
        latitude: 28.6139,
        longitude: 77.2090,
      };

      const result = await riderService.updateLocation(testUser.id, locationDto);
      expect(result.message).toBe('Location updated successfully');
      expect(result.location.latitude).toBe(locationDto.latitude);
      expect(result.location.longitude).toBe(locationDto.longitude);
    });
  });

  describe('Order Management Integration', () => {
    it('should handle complete order workflow', async () => {
      // Get initial orders
      const initialOrders = await riderService.getRiderOrders(testUser.id);
      expect(Array.isArray(initialOrders)).toBe(true);

      // Update order status through multiple stages
      const orderId = 'test-order-123';
      const statusUpdates = ['picked_up', 'in_transit', 'delivered'];

      for (const status of statusUpdates) {
        const updateDto = { status };
        const updatedOrder = await riderService.updateOrderStatus(orderId, testUser.id, updateDto);
        expect(updatedOrder.status).toBe(status);
        expect(updatedOrder.id).toBe(orderId);
      }
    });

    it('should handle order status validation', async () => {
      const orderId = 'test-order-456';

      // Try invalid status
      const invalidUpdateDto = { status: 'invalid-status' as any };

      await expect(
        riderService.updateOrderStatus(orderId, testUser.id, invalidUpdateDto)
      ).rejects.toThrow();
    });
  });

  describe('Earnings Management Integration', () => {
    it('should handle earnings workflow', async () => {
      // Get earnings history
      const paginationDto = { page: 1, limit: 10 };
      const earningsHistory = await riderService.getEarningsHistory(testUser.id, paginationDto);
      expect(earningsHistory).toHaveProperty('data');
      expect(earningsHistory).toHaveProperty('total');
      expect(earningsHistory).toHaveProperty('page');
      expect(earningsHistory).toHaveProperty('limit');

      // Get earnings summary
      const earningsSummary = await riderService.getEarningsSummary(testUser.id);
      expect(earningsSummary).toHaveProperty('totalEarnings');
      expect(earningsSummary).toHaveProperty('totalDeliveries');
      expect(earningsSummary).toHaveProperty('averagePerDelivery');
      expect(earningsSummary).toHaveProperty('dateRange');

      // Get specific earning details
      const earningId = 'test-earning-123';
      const earningDetails = await riderService.getEarningDetails(testUser.id, earningId);
      expect(earningDetails).toHaveProperty('id', earningId);
      expect(earningDetails).toHaveProperty('amount');
      expect(earningDetails).toHaveProperty('type');
      expect(earningDetails).toHaveProperty('status');
    });

    it('should handle withdrawal requests', async () => {
      const withdrawalDto = {
        amount: 500.00,
        bankAccountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test Rider',
      };

      const withdrawal = await riderService.requestWithdrawal(testUser.id, withdrawalDto);
      expect(withdrawal).toHaveProperty('id');
      expect(withdrawal).toHaveProperty('amount', 500.00);
      expect(withdrawal).toHaveProperty('status', 'pending');
      expect(withdrawal).toHaveProperty('bankAccountNumber', '****9012');
      expect(withdrawal).toHaveProperty('ifscCode', 'HDFC0001234');
      expect(withdrawal).toHaveProperty('accountHolderName', 'Test Rider');
      expect(withdrawal).toHaveProperty('requestedAt');

      // Get withdrawal history
      const paginationDto = { page: 1, limit: 10 };
      const withdrawalHistory = await riderService.getWithdrawalHistory(testUser.id, paginationDto);
      expect(withdrawalHistory).toHaveProperty('data');
      expect(withdrawalHistory).toHaveProperty('total');
      expect(Array.isArray(withdrawalHistory.data)).toBe(true);
    });
  });

  describe('Delivery Management Integration', () => {
    it('should handle delivery history and stats', async () => {
      // Get delivery history
      const paginationDto = { page: 1, limit: 10 };
      const deliveryHistory = await riderService.getDeliveryHistory(testUser.id, paginationDto);
      expect(deliveryHistory).toHaveProperty('data');
      expect(deliveryHistory).toHaveProperty('total');
      expect(Array.isArray(deliveryHistory.data)).toBe(true);

      // Get delivery statistics
      const deliveryStats = await riderService.getDeliveryStats(testUser.id);
      expect(deliveryStats).toHaveProperty('totalDeliveries');
      expect(deliveryStats).toHaveProperty('thisMonthDeliveries');
      expect(deliveryStats).toHaveProperty('averageDeliveryTime');
      expect(deliveryStats).toHaveProperty('onTimeDeliveryRate');
      expect(deliveryStats).toHaveProperty('averageRating');
      expect(deliveryStats).toHaveProperty('totalDistance');

      // Get upcoming deliveries
      const upcomingDeliveries = await riderService.getUpcomingDeliveries(testUser.id);
      expect(Array.isArray(upcomingDeliveries)).toBe(true);
    });

    it('should handle delivery rating', async () => {
      const deliveryId = 'test-delivery-123';
      const rateDto = {
        rating: 5,
        feedback: 'Excellent service provided!',
      };

      const ratedDelivery = await riderService.rateDelivery(testUser.id, deliveryId, rateDto);
      expect(ratedDelivery).toHaveProperty('id', deliveryId);
      expect(ratedDelivery).toHaveProperty('customerRating', 5);
      expect(ratedDelivery).toHaveProperty('customerFeedback', 'Excellent service provided!');
    });
  });

  describe('Route Optimization Integration', () => {
    it('should handle route optimization workflow', async () => {
      // Get optimized route
      const optimizedRoute = await riderService.getOptimizedRoute(testUser.id);
      expect(optimizedRoute).toHaveProperty('id');
      expect(optimizedRoute).toHaveProperty('deliverySequence');
      expect(optimizedRoute).toHaveProperty('totalDistance');
      expect(optimizedRoute).toHaveProperty('totalTime');
      expect(optimizedRoute).toHaveProperty('optimizedAt');
      expect(Array.isArray(optimizedRoute.deliverySequence)).toBe(true);

      // Set route preferences
      const preferencesDto = {
        maxDeliveryDistance: 10,
        preferredAreas: ['Area 1', 'Area 2'],
        avoidTolls: false,
        routeType: 'fastest' as 'fastest' | 'shortest' | 'scenic',
      };

      const updatedPreferences = await riderService.setRoutePreferences(testUser.id, preferencesDto);
      expect(updatedPreferences).toEqual(preferencesDto);

      // Get route history
      const paginationDto = { page: 1, limit: 10 };
      const routeHistory = await riderService.getRouteHistory(testUser.id, paginationDto);
      expect(routeHistory).toHaveProperty('data');
      expect(routeHistory).toHaveProperty('total');
      expect(Array.isArray(routeHistory.data)).toBe(true);

      // Complete route
      const routeId = 'test-route-123';
      const completedRoute = await riderService.completeRoute(testUser.id, routeId);
      expect(completedRoute).toHaveProperty('id', routeId);
      expect(completedRoute).toHaveProperty('status', 'completed');
      expect(completedRoute).toHaveProperty('startedAt');
      expect(completedRoute).toHaveProperty('completedAt');
    });
  });

  describe('Performance Tracking Integration', () => {
    it('should handle performance tracking workflow', async () => {
      // Get performance metrics
      const performanceMetrics = await riderService.getPerformanceMetrics(testUser.id);
      expect(performanceMetrics).toHaveProperty('overallScore');
      expect(performanceMetrics).toHaveProperty('completionRate');
      expect(performanceMetrics).toHaveProperty('onTimeRate');
      expect(performanceMetrics).toHaveProperty('averageRating');
      expect(performanceMetrics).toHaveProperty('monthlyEarnings');
      expect(performanceMetrics).toHaveProperty('period');

      // Get rider rating
      const riderRating = await riderService.getRiderRating(testUser.id);
      expect(riderRating).toHaveProperty('averageRating');
      expect(riderRating).toHaveProperty('totalRatings');
      expect(riderRating).toHaveProperty('ratingDistribution');
      expect(riderRating).toHaveProperty('recentRatings');
      expect(Array.isArray(riderRating.recentRatings)).toBe(true);

      // Get leaderboard position
      const leaderboardPosition = await riderService.getLeaderboardPosition(testUser.id);
      expect(leaderboardPosition).toHaveProperty('currentRank');
      expect(leaderboardPosition).toHaveProperty('totalRiders');
      expect(leaderboardPosition).toHaveProperty('score');
      expect(leaderboardPosition).toHaveProperty('topPerformers');
      expect(leaderboardPosition).toHaveProperty('nearbyRiders');
      expect(Array.isArray(leaderboardPosition.topPerformers)).toBe(true);
      expect(Array.isArray(leaderboardPosition.nearbyRiders)).toBe(true);

      // Get performance goals
      const performanceGoals = await riderService.getPerformanceGoals(testUser.id);
      expect(performanceGoals).toHaveProperty('monthlyDeliveries');
      expect(performanceGoals).toHaveProperty('currentDeliveries');
      expect(performanceGoals).toHaveProperty('monthlyEarnings');
      expect(performanceGoals).toHaveProperty('currentEarnings');
      expect(performanceGoals).toHaveProperty('targetRating');
      expect(performanceGoals).toHaveProperty('currentRating');
      expect(performanceGoals).toHaveProperty('daysRemaining');
    });
  });

  describe('Schedule Management Integration', () => {
    it('should handle schedule management workflow', async () => {
      // Get current schedule
      const schedule = await riderService.getSchedule(testUser.id);
      expect(Array.isArray(schedule)).toBe(true);

      // Create new schedule slot
      const scheduleDto = {
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T18:00:00Z',
        dayOfWeek: 'monday',
      };

      const newSlot = await riderService.createScheduleSlot(testUser.id, scheduleDto);
      expect(newSlot).toHaveProperty('id');
      expect(newSlot).toHaveProperty('startTime');
      expect(newSlot).toHaveProperty('endTime');
      expect(newSlot).toHaveProperty('dayOfWeek', 'monday');
      expect(newSlot).toHaveProperty('isActive', true);

      // Update schedule slot
      const updateDto = {
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T19:00:00Z',
        isActive: true,
      };

      const updatedSlot = await riderService.updateScheduleSlot(testUser.id, newSlot.id, updateDto);
      expect(updatedSlot).toHaveProperty('id', newSlot.id);
      expect(updatedSlot).toHaveProperty('isActive', true);

      // Get availability status
      const availabilityStatus = await riderService.getAvailabilityStatus(testUser.id);
      expect(availabilityStatus).toHaveProperty('isAvailable');
      expect(availabilityStatus).toHaveProperty('currentSlot');
      expect(availabilityStatus).toHaveProperty('nextSlot');

      // Delete schedule slot
      const deleteResult = await riderService.deleteScheduleSlot(testUser.id, newSlot.id);
      expect(deleteResult).toHaveProperty('message', 'Schedule slot deleted successfully');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle rider not found errors consistently', async () => {
      const nonExistentUserId = 'non-existent-user-id';

      // All service methods should throw NotFoundException for non-existent rider
      await expect(riderService.getRiderProfile(nonExistentUserId)).rejects.toThrow();
      await expect(riderService.updateAvailability(nonExistentUserId, true)).rejects.toThrow();
      await expect(riderService.updateLocation(nonExistentUserId, { latitude: 0, longitude: 0 })).rejects.toThrow();
      await expect(riderService.getRiderOrders(nonExistentUserId)).rejects.toThrow();
      await expect(riderService.getEarningsSummary(nonExistentUserId)).rejects.toThrow();
      await expect(riderService.getDeliveryStats(nonExistentUserId)).rejects.toThrow();
      await expect(riderService.getPerformanceMetrics(nonExistentUserId)).rejects.toThrow();
      await expect(riderService.getSchedule(nonExistentUserId)).rejects.toThrow();
      await expect(riderService.getAvailabilityStatus(nonExistentUserId)).rejects.toThrow();
    });

    it('should handle invalid data validation', async () => {
      // Invalid location coordinates
      await expect(
        riderService.updateLocation(testUser.id, { latitude: -91, longitude: 0 })
      ).rejects.toThrow();

      await expect(
        riderService.updateLocation(testUser.id, { latitude: 0, longitude: -181 })
      ).rejects.toThrow();

      // Invalid withdrawal amount
      const invalidWithdrawalDto = {
        amount: 50, // Less than minimum
        bankAccountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test Rider',
      };

      await expect(
        riderService.requestWithdrawal(testUser.id, invalidWithdrawalDto)
      ).rejects.toThrow();
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across operations', async () => {
      // Create rider
      const rider = await riderService.create(
        'consistency-test-user',
        'Consistency Test Rider',
        '+919876543211',
        'car',
        'DL02CA5678'
      );

      // Perform multiple operations
      await riderService.updateAvailability('consistency-test-user', false);
      await riderService.updateLocation('consistency-test-user', {
        latitude: 28.6139,
        longitude: 77.2090,
      });

      // Verify all changes are reflected
      const updatedRider = await riderService.getRiderProfile('consistency-test-user');
      expect(updatedRider.isAvailable).toBe(false);
      expect(updatedRider.currentLocation?.latitude).toBe(28.6139);
      expect(updatedRider.currentLocation?.longitude).toBe(77.2090);
    });

    it('should handle concurrent operations gracefully', async () => {
      const operations = [
        riderService.updateAvailability(testUser.id, true),
        riderService.updateAvailability(testUser.id, false),
        riderService.updateLocation(testUser.id, { latitude: 28.6139, longitude: 77.2090 }),
        riderService.updateLocation(testUser.id, { latitude: 28.6239, longitude: 77.2190 }),
      ];

      // Execute operations concurrently
      await Promise.all(operations);

      // Verify final state
      const finalRider = await riderService.getRiderProfile(testUser.id);
      expect(finalRider).toBeDefined();
      expect(finalRider.currentLocation).toBeDefined();
    });
  });
});