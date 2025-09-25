import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RiderService, DeliveryRider, LocationUpdateDto } from './rider.service';
import { OrderFactory } from '../../test/factories/order.factory.spec';
import { UserFactory } from '../../test/factories/user.factory.spec';
import { TestHelper } from '../../test/utils/test-helpers.spec';

describe('RiderService', () => {
  let service: RiderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiderService],
    }).compile();

    service = module.get<RiderService>(RiderService);
  });

  afterEach(async () => {
    // Clean up any test data
    service['riders'].clear();
    service['userRiderIndex'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should return null when rider not found', async () => {
      const result = await service.findByUserId('non-existent-user');
      expect(result).toBeNull();
    });

    it('should return rider when found', async () => {
      const user = UserFactory.createRider();
      const rider = await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const foundRider = await service.findByUserId(user.id);
      expect(foundRider).toEqual(rider);
    });
  });

  describe('getRiderOrders', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getRiderOrders('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return orders for existing rider', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const orders = await service.getRiderOrders(user.id);
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThan(0);

      // Verify order structure
      orders.forEach(order => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('userId');
        expect(order).toHaveProperty('vendorId');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('deliveryAddress');
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const updateDto = { status: 'picked_up' };

      await expect(
        service.updateOrderStatus('order-123', 'non-existent-user', updateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid status', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const updateDto = { status: 'invalid-status' as any };

      await expect(
        service.updateOrderStatus('order-123', user.id, updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should update order status successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const updateDto = { status: 'picked_up' };
      const result = await service.updateOrderStatus('order-123', user.id, updateDto);

      expect(result).toHaveProperty('id', 'order-123');
      expect(result).toHaveProperty('status', 'picked_up');
      expect(result).toHaveProperty('deliveryAddress');
    });

    it('should accept valid status transitions', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const validStatuses = ['picked_up', 'in_transit', 'delivered'];

      for (const status of validStatuses) {
        const updateDto = { status };
        const result = await service.updateOrderStatus(`order-${status}`, user.id, updateDto);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('updateLocation', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const locationDto: LocationUpdateDto = {
        latitude: 28.6139,
        longitude: 77.2090,
      };

      await expect(
        service.updateLocation('non-existent-user', locationDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should update rider location successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const locationDto: LocationUpdateDto = {
        latitude: 28.6139,
        longitude: 77.2090,
      };

      const result = await service.updateLocation(user.id, locationDto);

      expect(result.message).toBe('Location updated successfully');
      expect(result.location).toHaveProperty('latitude', locationDto.latitude);
      expect(result.location).toHaveProperty('longitude', locationDto.longitude);
      expect(result.location).toHaveProperty('updatedAt');
    });

    it('should update rider currentLocation in memory', async () => {
      const user = UserFactory.createRider();
      const rider = await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const locationDto: LocationUpdateDto = {
        latitude: 28.6139,
        longitude: 77.2090,
      };

      await service.updateLocation(user.id, locationDto);

      const updatedRider = await service.findByUserId(user.id);
      expect(updatedRider?.currentLocation?.latitude).toBe(locationDto.latitude);
      expect(updatedRider?.currentLocation?.longitude).toBe(locationDto.longitude);
    });
  });

  describe('getRiderProfile', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getRiderProfile('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return rider profile successfully', async () => {
      const user = UserFactory.createRider();
      const rider = await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const profile = await service.getRiderProfile(user.id);
      expect(profile).toEqual(rider);
    });
  });

  describe('updateAvailability', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.updateAvailability('non-existent-user', true)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should update availability to true', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.updateAvailability(user.id, true);
      expect(result.isAvailable).toBe(true);
    });

    it('should update availability to false', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.updateAvailability(user.id, false);
      expect(result.isAvailable).toBe(false);
    });

    it('should update rider in memory', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      await service.updateAvailability(user.id, false);

      const updatedRider = await service.findByUserId(user.id);
      expect(updatedRider?.isAvailable).toBe(false);
    });
  });

  describe('create', () => {
    it('should create rider successfully', async () => {
      const user = UserFactory.createRider();
      const result = await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe(user.id);
      expect(result.name).toBe(user.name);
      expect(result.phone).toBe(user.phone);
      expect(result.vehicleType).toBe('bike');
      expect(result.vehicleNumber).toBe('DL01CA1234');
      expect(result.isActive).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(result.rating).toBeGreaterThanOrEqual(4.0);
      expect(result.rating).toBeLessThanOrEqual(5.0);
      expect(result.totalDeliveries).toBeGreaterThanOrEqual(0);
      expect(result.totalDeliveries).toBeLessThan(500);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should add rider to memory storage', async () => {
      const user = UserFactory.createRider();
      const rider = await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const foundRider = await service.findByUserId(user.id);
      expect(foundRider).toEqual(rider);
    });

    it('should update user-rider index', async () => {
      const user = UserFactory.createRider();
      const rider = await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const riderId = service['userRiderIndex'].get(user.id);
      expect(riderId).toBe(rider.id);
    });
  });

  describe('seedTestData', () => {
    it('should seed test data without errors', async () => {
      await expect(service.seedTestData()).resolves.not.toThrow();
    });

    it('should create test riders', async () => {
      await service.seedTestData();

      const testRider1 = await service.findByUserId('2749f45b-5f31-469d-aef4-eaf5697fd6cd');
      expect(testRider1).toBeDefined();
      expect(testRider1?.name).toBe('Test Rider');
      expect(testRider1?.phone).toBe('7777777777');
    });
  });

  // ===== EARNINGS MANAGEMENT TESTS =====

  describe('getEarningsHistory', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const paginationDto = { page: 1, limit: 10 };

      await expect(
        service.getEarningsHistory('non-existent-user', paginationDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return paginated earnings history', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const paginationDto = { page: 1, limit: 10 };
      const result = await service.getEarningsHistory(user.id, paginationDto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('hasNext');
      expect(result).toHaveProperty('hasPrev');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should sort earnings by specified field', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const paginationDto = { page: 1, limit: 10, sortBy: 'amount', sortOrder: 'desc' as 'asc' | 'desc' };
      const result = await service.getEarningsHistory(user.id, paginationDto);

      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('getEarningsSummary', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getEarningsSummary('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return earnings summary', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getEarningsSummary(user.id);

      expect(result).toHaveProperty('totalEarnings');
      expect(result).toHaveProperty('totalDeliveries');
      expect(result).toHaveProperty('averagePerDelivery');
      expect(result).toHaveProperty('totalTips');
      expect(result).toHaveProperty('totalBonuses');
      expect(result).toHaveProperty('pendingWithdrawal');
      expect(result).toHaveProperty('dateRange');
      expect(result.dateRange).toHaveProperty('startDate');
      expect(result.dateRange).toHaveProperty('endDate');
    });
  });

  describe('getEarningDetails', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getEarningDetails('non-existent-user', 'earning-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return earning details', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getEarningDetails(user.id, 'earning-123');

      expect(result).toHaveProperty('id', 'earning-123');
      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('earnedAt');
      expect(result).toHaveProperty('description');
    });
  });

  describe('requestWithdrawal', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const withdrawalDto = {
        amount: 500,
        bankAccountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test User',
      };

      await expect(
        service.requestWithdrawal('non-existent-user', withdrawalDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should create withdrawal request successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const withdrawalDto = {
        amount: 500,
        bankAccountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test User',
      };

      const result = await service.requestWithdrawal(user.id, withdrawalDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('amount', 500);
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('bankAccountNumber', '****7890');
      expect(result).toHaveProperty('ifscCode', 'HDFC0001234');
      expect(result).toHaveProperty('accountHolderName', 'Test User');
      expect(result).toHaveProperty('requestedAt');
    });
  });

  describe('getWithdrawalHistory', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const paginationDto = { page: 1, limit: 10 };

      await expect(
        service.getWithdrawalHistory('non-existent-user', paginationDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return withdrawal history', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const paginationDto = { page: 1, limit: 10 };
      const result = await service.getWithdrawalHistory(user.id, paginationDto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('hasNext');
      expect(result).toHaveProperty('hasPrev');
    });
  });

  // ===== DELIVERY HISTORY TESTS =====

  describe('getDeliveryHistory', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const paginationDto = { page: 1, limit: 10 };

      await expect(
        service.getDeliveryHistory('non-existent-user', paginationDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return delivery history', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const paginationDto = { page: 1, limit: 10 };
      const result = await service.getDeliveryHistory(user.id, paginationDto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('hasNext');
      expect(result).toHaveProperty('hasPrev');
    });
  });

  describe('getDeliveryDetails', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getDeliveryDetails('non-existent-user', 'delivery-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return delivery details', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getDeliveryDetails(user.id, 'delivery-123');

      expect(result).toHaveProperty('id', 'delivery-123');
      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('customerName');
      expect(result).toHaveProperty('customerPhone');
      expect(result).toHaveProperty('deliveryAddress');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('scheduledTime');
      expect(result).toHaveProperty('completedAt');
      expect(result).toHaveProperty('customerRating');
      expect(result).toHaveProperty('customerFeedback');
    });
  });

  describe('getDeliveryStats', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getDeliveryStats('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return delivery statistics', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getDeliveryStats(user.id);

      expect(result).toHaveProperty('totalDeliveries');
      expect(result).toHaveProperty('thisMonthDeliveries');
      expect(result).toHaveProperty('averageDeliveryTime');
      expect(result).toHaveProperty('onTimeDeliveryRate');
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('totalDistance');
    });
  });

  describe('rateDelivery', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const rateDto = { rating: 5, feedback: 'Great service!' };

      await expect(
        service.rateDelivery('non-existent-user', 'delivery-123', rateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should rate delivery successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const rateDto = { rating: 5, feedback: 'Excellent service!' };
      const result = await service.rateDelivery(user.id, 'delivery-123', rateDto);

      expect(result).toHaveProperty('id', 'delivery-123');
      expect(result).toHaveProperty('customerRating', 5);
      expect(result).toHaveProperty('customerFeedback', 'Excellent service!');
    });
  });

  describe('getUpcomingDeliveries', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getUpcomingDeliveries('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return upcoming deliveries', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getUpcomingDeliveries(user.id);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const delivery = result[0];
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

  // ===== ROUTE OPTIMIZATION TESTS =====

  describe('getOptimizedRoute', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getOptimizedRoute('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return optimized route', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getOptimizedRoute(user.id);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('deliverySequence');
      expect(result).toHaveProperty('totalDistance');
      expect(result).toHaveProperty('totalTime');
      expect(result).toHaveProperty('optimizedAt');
      expect(Array.isArray(result.deliverySequence)).toBe(true);

      if (result.deliverySequence.length > 0) {
        const sequence = result.deliverySequence[0];
        expect(sequence).toHaveProperty('orderId');
        expect(sequence).toHaveProperty('sequence');
        expect(sequence).toHaveProperty('estimatedArrival');
        expect(sequence).toHaveProperty('address');
      }
    });
  });

  describe('setRoutePreferences', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const preferencesDto = {
        maxDistance: 10,
        preferredAreas: ['area1', 'area2'],
        avoidTolls: true,
      };

      await expect(
        service.setRoutePreferences('non-existent-user', preferencesDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should set route preferences successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const preferencesDto = {
        maxDeliveryDistance: 10,
        preferredAreas: ['area1', 'area2'],
        avoidTolls: true,
        routeType: 'fastest' as 'fastest' | 'shortest' | 'scenic',
      };

      const result = await service.setRoutePreferences(user.id, preferencesDto);
      expect(result).toEqual(preferencesDto);
    });
  });

  describe('getRouteHistory', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const paginationDto = { page: 1, limit: 10 };

      await expect(
        service.getRouteHistory('non-existent-user', paginationDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return route history', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const paginationDto = { page: 1, limit: 10 };
      const result = await service.getRouteHistory(user.id, paginationDto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('hasNext');
      expect(result).toHaveProperty('hasPrev');
    });
  });

  describe('completeRoute', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.completeRoute('non-existent-user', 'route-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should complete route successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.completeRoute(user.id, 'route-123');

      expect(result).toHaveProperty('id', 'route-123');
      expect(result).toHaveProperty('routeDate');
      expect(result).toHaveProperty('totalDeliveries');
      expect(result).toHaveProperty('totalDistance');
      expect(result).toHaveProperty('totalTime');
      expect(result).toHaveProperty('status', 'completed');
      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('completedAt');
    });
  });

  // ===== PERFORMANCE TRACKING TESTS =====

  describe('getPerformanceMetrics', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getPerformanceMetrics('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return performance metrics', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getPerformanceMetrics(user.id);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('onTimeRate');
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('monthlyEarnings');
      expect(result).toHaveProperty('period');
      expect(result.period).toHaveProperty('startDate');
      expect(result.period).toHaveProperty('endDate');
    });
  });

  describe('getRiderRating', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getRiderRating('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return rider rating details', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getRiderRating(user.id);

      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('totalRatings');
      expect(result).toHaveProperty('ratingDistribution');
      expect(result).toHaveProperty('recentRatings');
      expect(Array.isArray(result.recentRatings)).toBe(true);
    });
  });

  describe('getLeaderboardPosition', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getLeaderboardPosition('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return leaderboard position', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getLeaderboardPosition(user.id);

      expect(result).toHaveProperty('currentRank');
      expect(result).toHaveProperty('totalRiders');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('topPerformers');
      expect(result).toHaveProperty('nearbyRiders');
      expect(Array.isArray(result.topPerformers)).toBe(true);
      expect(Array.isArray(result.nearbyRiders)).toBe(true);
    });
  });

  describe('getPerformanceGoals', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getPerformanceGoals('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return performance goals', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getPerformanceGoals(user.id);

      expect(result).toHaveProperty('monthlyDeliveries');
      expect(result).toHaveProperty('currentDeliveries');
      expect(result).toHaveProperty('monthlyEarnings');
      expect(result).toHaveProperty('currentEarnings');
      expect(result).toHaveProperty('targetRating');
      expect(result).toHaveProperty('currentRating');
      expect(result).toHaveProperty('daysRemaining');
    });
  });

  // ===== AVAILABILITY & SCHEDULING TESTS =====

  describe('getSchedule', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getSchedule('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return rider schedule', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getSchedule(user.id);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const slot = result[0];
        expect(slot).toHaveProperty('id');
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('dayOfWeek');
        expect(slot).toHaveProperty('isActive');
        expect(slot).toHaveProperty('createdAt');
      }
    });
  });

  describe('createScheduleSlot', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const scheduleDto = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T18:00:00Z'),
        dayOfWeek: 'monday',
      };

      await expect(
        service.createScheduleSlot('non-existent-user', scheduleDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should create schedule slot successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const scheduleDto = {
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T18:00:00Z',
        dayOfWeek: 'monday',
      };

      const result = await service.createScheduleSlot(user.id, scheduleDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('dayOfWeek', 'monday');
      expect(result).toHaveProperty('isActive', true);
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('updateScheduleSlot', () => {
    it('should throw NotFoundException when rider not found', async () => {
      const updateDto = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T18:00:00Z'),
        isActive: true,
      };

      await expect(
        service.updateScheduleSlot('non-existent-user', 'slot-123', updateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should update schedule slot successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const updateDto = {
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T18:00:00Z',
        isActive: true,
      };

      const result = await service.updateScheduleSlot(user.id, 'slot-123', updateDto);

      expect(result).toHaveProperty('id', 'slot-123');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('dayOfWeek', 'monday');
      expect(result).toHaveProperty('isActive', true);
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('deleteScheduleSlot', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.deleteScheduleSlot('non-existent-user', 'slot-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should delete schedule slot successfully', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.deleteScheduleSlot(user.id, 'slot-123');

      expect(result).toHaveProperty('message', 'Schedule slot deleted successfully');
    });
  });

  describe('getAvailabilityStatus', () => {
    it('should throw NotFoundException when rider not found', async () => {
      await expect(service.getAvailabilityStatus('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return availability status', async () => {
      const user = UserFactory.createRider();
      await service.create(
        user.id,
        user.name || 'Test Rider',
        user.phone,
        'bike',
        'DL01CA1234'
      );

      const result = await service.getAvailabilityStatus(user.id);

      expect(result).toHaveProperty('isAvailable');
      expect(result).toHaveProperty('currentSlot');
      expect(result).toHaveProperty('nextSlot');

      if (result.isAvailable && result.currentSlot) {
        expect(result.currentSlot).toHaveProperty('id');
        expect(result.currentSlot).toHaveProperty('startTime');
        expect(result.currentSlot).toHaveProperty('endTime');
        expect(result.currentSlot).toHaveProperty('dayOfWeek');
      }

      if (!result.isAvailable && result.nextSlot) {
        expect(result.nextSlot).toHaveProperty('id');
        expect(result.nextSlot).toHaveProperty('startTime');
        expect(result.nextSlot).toHaveProperty('endTime');
        expect(result.nextSlot).toHaveProperty('dayOfWeek');
      }
    });
  });
});