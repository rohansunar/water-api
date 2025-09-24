import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RiderService, DeliveryRider } from './rider.service';

describe('RiderService', () => {
  let service: RiderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiderService],
    }).compile();

    service = module.get<RiderService>(RiderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should return rider if found', async () => {
      const rider: DeliveryRider = {
        id: 'rider-id',
        userId: 'user-id',
        name: 'Test Rider',
        phone: '1234567890',
        vehicleType: 'Motorcycle',
        vehicleNumber: 'DL01AB1234',
        isActive: true,
        isAvailable: true,
        rating: 4.5,
        totalDeliveries: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add rider to service
      (service as any).riders.set('rider-id', rider);
      (service as any).userRiderIndex.set('user-id', 'rider-id');

      const result = await service.findByUserId('user-id');

      expect(result).toEqual(rider);
    });

    it('should return null if rider not found', async () => {
      const result = await service.findByUserId('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('getRiderOrders', () => {
    it('should return rider orders', async () => {
      const rider: DeliveryRider = {
        id: 'rider-id',
        userId: 'user-id',
        name: 'Test Rider',
        phone: '1234567890',
        vehicleType: 'Motorcycle',
        vehicleNumber: 'DL01AB1234',
        isActive: true,
        isAvailable: true,
        rating: 4.5,
        totalDeliveries: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).riders.set('rider-id', rider);
      (service as any).userRiderIndex.set('user-id', 'rider-id');

      const result = await service.getRiderOrders('user-id');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'order-rider-1');
      expect(result[1]).toHaveProperty('id', 'order-rider-2');
    });

    it('should throw NotFoundException if rider not found', async () => {
      await expect(service.getRiderOrders('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOrderStatus', () => {
    const rider: DeliveryRider = {
      id: 'rider-id',
      userId: 'user-id',
      name: 'Test Rider',
      phone: '1234567890',
      vehicleType: 'Motorcycle',
      vehicleNumber: 'DL01AB1234',
      isActive: true,
      isAvailable: true,
      rating: 4.5,
      totalDeliveries: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).riders.set('rider-id', rider);
      (service as any).userRiderIndex.set('user-id', 'rider-id');
    });

    it('should update order status successfully', async () => {
      const updateDto = { status: 'picked_up' as any };

      const result = await service.updateOrderStatus('order-1', 'user-id', updateDto);

      expect(result).toHaveProperty('id', 'order-1');
      expect(result.status).toBe('picked_up');
    });

    it('should throw NotFoundException if rider not found', async () => {
      const updateDto = { status: 'picked_up' as any };

      await expect(service.updateOrderStatus('order-1', 'non-existent-user', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid status', async () => {
      const updateDto = { status: 'invalid_status' as any };

      await expect(service.updateOrderStatus('order-1', 'user-id', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateLocation', () => {
    const rider: DeliveryRider = {
      id: 'rider-id',
      userId: 'user-id',
      name: 'Test Rider',
      phone: '1234567890',
      vehicleType: 'Motorcycle',
      vehicleNumber: 'DL01AB1234',
      isActive: true,
      isAvailable: true,
      rating: 4.5,
      totalDeliveries: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).riders.set('rider-id', rider);
      (service as any).userRiderIndex.set('user-id', 'rider-id');
    });

    it('should update rider location successfully', async () => {
      const locationDto = { latitude: 28.6139, longitude: 77.209 };

      const result = await service.updateLocation('user-id', locationDto);

      expect(result.message).toBe('Location updated successfully');
      expect(result.location).toHaveProperty('latitude', 28.6139);
      expect(result.location).toHaveProperty('longitude', 77.209);
      expect(result.location).toHaveProperty('updatedAt');
    });

    it('should throw NotFoundException if rider not found', async () => {
      const locationDto = { latitude: 28.6139, longitude: 77.209 };

      await expect(service.updateLocation('non-existent-user', locationDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRiderProfile', () => {
    it('should return rider profile', async () => {
      const rider: DeliveryRider = {
        id: 'rider-id',
        userId: 'user-id',
        name: 'Test Rider',
        phone: '1234567890',
        vehicleType: 'Motorcycle',
        vehicleNumber: 'DL01AB1234',
        isActive: true,
        isAvailable: true,
        rating: 4.5,
        totalDeliveries: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).riders.set('rider-id', rider);
      (service as any).userRiderIndex.set('user-id', 'rider-id');

      const result = await service.getRiderProfile('user-id');

      expect(result).toEqual(rider);
    });

    it('should throw NotFoundException if rider not found', async () => {
      await expect(service.getRiderProfile('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAvailability', () => {
    const rider: DeliveryRider = {
      id: 'rider-id',
      userId: 'user-id',
      name: 'Test Rider',
      phone: '1234567890',
      vehicleType: 'Motorcycle',
      vehicleNumber: 'DL01AB1234',
      isActive: true,
      isAvailable: true,
      rating: 4.5,
      totalDeliveries: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).riders.set('rider-id', rider);
      (service as any).userRiderIndex.set('user-id', 'rider-id');
    });

    it('should update rider availability to available', async () => {
      const result = await service.updateAvailability('user-id', true);

      expect(result.isAvailable).toBe(true);
    });

    it('should update rider availability to unavailable', async () => {
      const result = await service.updateAvailability('user-id', false);

      expect(result.isAvailable).toBe(false);
    });

    it('should throw NotFoundException if rider not found', async () => {
      await expect(service.updateAvailability('non-existent-user', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create rider successfully', async () => {
      const result = await service.create(
        'user-id',
        'Test Rider',
        '1234567890',
        'Motorcycle',
        'DL01AB1234',
      );

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe('user-id');
      expect(result.name).toBe('Test Rider');
      expect(result.phone).toBe('1234567890');
      expect(result.vehicleType).toBe('Motorcycle');
      expect(result.vehicleNumber).toBe('DL01AB1234');
      expect(result.isActive).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(result.rating).toBeGreaterThanOrEqual(4.0);
      expect(result.rating).toBeLessThanOrEqual(5.0);
      expect(result.totalDeliveries).toBeGreaterThanOrEqual(0);
      expect(result.totalDeliveries).toBeLessThanOrEqual(499);
    });
  });

  describe('seedTestData', () => {
    it('should seed test data successfully', async () => {
      await service.seedTestData();

      // Check if test riders were created
      const rider1 = await service.findByUserId('2749f45b-5f31-469d-aef4-eaf5697fd6cd');
      const rider2 = await service.findByUserId('rider-2');

      expect(rider1).toBeTruthy();
      expect(rider1?.name).toBe('Test Rider');
      expect(rider1?.phone).toBe('7777777777');

      expect(rider2).toBeTruthy();
      expect(rider2?.name).toBe('Rider Two');
      expect(rider2?.phone).toBe('6666666666');
    });

    it('should not create duplicate riders', async () => {
      await service.seedTestData();
      await service.seedTestData(); // Run again

      // Should still work without errors
      const rider = await service.findByUserId('2749f45b-5f31-469d-aef4-eaf5697fd6cd');
      expect(rider).toBeTruthy();
    });
  });
});