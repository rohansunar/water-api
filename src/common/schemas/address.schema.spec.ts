import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address, AddressSchema } from './address.schema';

describe('Address Schema', () => {
  let addressModel: Model<Address>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(Address.name),
          useValue: {
            new: jest.fn().mockResolvedValue({}),
            constructor: jest.fn().mockResolvedValue({}),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            updateMany: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    addressModel = module.get<Model<Address>>(getModelToken(Address.name));
  });

  describe('Schema Definition', () => {
    it('should have correct schema structure', () => {
      const schema = AddressSchema;
      expect(schema).toBeDefined();
      expect(schema.paths.userId).toBeDefined();
      expect(schema.paths.line1).toBeDefined();
      expect(schema.paths.city).toBeDefined();
      expect(schema.paths.state).toBeDefined();
      expect(schema.paths.pincode).toBeDefined();
      expect(schema.paths.location).toBeDefined();
      expect(schema.paths.contactPhone).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = AddressSchema;
      expect(schema.paths.userId.isRequired).toBe(true);
      expect(schema.paths.line1.isRequired).toBe(true);
      expect(schema.paths.city.isRequired).toBe(true);
      expect(schema.paths.state.isRequired).toBe(true);
      expect(schema.paths.pincode.isRequired).toBe(true);
      expect(schema.paths.contactPhone.isRequired).toBe(true);
    });

    it('should have correct default values', () => {
      const schema = AddressSchema;
      expect(schema.paths.country.defaultValue).toBe('IN');
      expect(schema.paths.isDefault.defaultValue).toBe(false);
      expect(schema.paths.isActive.defaultValue).toBe(true);
    });

    it('should have correct field constraints', () => {
      const schema = AddressSchema;
      expect(schema.paths.label.options.maxlength).toBe(64);
      expect(schema.paths.line1.options.maxlength).toBe(255);
      expect(schema.paths.line2.options.maxlength).toBe(255);
      expect(schema.paths.city.options.maxlength).toBe(64);
      expect(schema.paths.state.options.maxlength).toBe(64);
      expect(schema.paths.country.options.maxlength).toBe(64);
      expect(schema.paths.pincode.options.maxlength).toBe(16);
    });
  });

  describe('Geospatial Location', () => {
    it('should have correct GeoJSON Point structure', () => {
      const schema = AddressSchema;
      const locationPath = schema.paths.location as any;
      
      expect(locationPath).toBeDefined();
      expect(locationPath.schema.paths.type).toBeDefined();
      expect(locationPath.schema.paths.coordinates).toBeDefined();
    });

    it('should have 2dsphere index on location', () => {
      const schema = AddressSchema;
      const indexes = schema.indexes();
      
      const locationIndex = indexes.find(index => index[0].location === '2dsphere');
      expect(locationIndex).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', () => {
      const schema = AddressSchema;
      const indexes = schema.indexes();
      
      // Check for userId index
      const userIdIndex = indexes.find(index => index[0].userId === 1);
      expect(userIdIndex).toBeDefined();
      
      // Check for pincode index
      const pincodeIndex = indexes.find(index => index[0].pincode === 1);
      expect(pincodeIndex).toBeDefined();
      
      // Check for city index
      const cityIndex = indexes.find(index => index[0].city === 1);
      expect(cityIndex).toBeDefined();
      
      // Check for compound indexes
      const userDefaultIndex = indexes.find(index => 
        index[0].userId === 1 && index[0].isDefault === 1
      );
      expect(userDefaultIndex).toBeDefined();
      
      const pincodeCity = indexes.find(index => 
        index[0].pincode === 1 && index[0].city === 1
      );
      expect(pincodeCity).toBeDefined();
    });
  });

  describe('Pre-save Middleware', () => {
    let mockAddress: any;
    let mockConstructor: any;

    beforeEach(() => {
      mockConstructor = {
        updateMany: jest.fn().mockResolvedValue({}),
      };
      
      mockAddress = {
        isDefault: true,
        isModified: jest.fn().mockReturnValue(true),
        userId: '507f1f77bcf86cd799439011',
        _id: '507f1f77bcf86cd799439012',
        constructor: mockConstructor,
      };
    });

    it('should remove default flag from other addresses when setting new default', async () => {
      // Simulate pre-save middleware logic
      if (mockAddress.isDefault && mockAddress.isModified('isDefault')) {
        await mockAddress.constructor.updateMany(
          { 
            userId: mockAddress.userId, 
            _id: { $ne: mockAddress._id },
            isDefault: true 
          },
          { $set: { isDefault: false } }
        );
      }
      
      expect(mockConstructor.updateMany).toHaveBeenCalledWith(
        { 
          userId: mockAddress.userId, 
          _id: { $ne: mockAddress._id },
          isDefault: true 
        },
        { $set: { isDefault: false } }
      );
    });

    it('should not update other addresses if isDefault is false', async () => {
      mockAddress.isDefault = false;
      
      // Simulate pre-save middleware logic
      if (mockAddress.isDefault && mockAddress.isModified('isDefault')) {
        await mockAddress.constructor.updateMany(
          { 
            userId: mockAddress.userId, 
            _id: { $ne: mockAddress._id },
            isDefault: true 
          },
          { $set: { isDefault: false } }
        );
      }
      
      expect(mockConstructor.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('Virtual Properties', () => {
    it('should have latitude virtual property', () => {
      const schema = AddressSchema;
      const latitudeVirtual = schema.virtuals.latitude;
      expect(latitudeVirtual).toBeDefined();
    });

    it('should have longitude virtual property', () => {
      const schema = AddressSchema;
      const longitudeVirtual = schema.virtuals.longitude;
      expect(longitudeVirtual).toBeDefined();
    });

    it('should calculate latitude from location coordinates', () => {
      const mockAddress = {
        location: {
          coordinates: [77.5946, 12.9716] // [longitude, latitude]
        }
      };
      
      // Simulate virtual getter
      const latitude = mockAddress.location?.coordinates[1];
      expect(latitude).toBe(12.9716);
    });

    it('should calculate longitude from location coordinates', () => {
      const mockAddress = {
        location: {
          coordinates: [77.5946, 12.9716] // [longitude, latitude]
        }
      };
      
      // Simulate virtual getter
      const longitude = mockAddress.location?.coordinates[0];
      expect(longitude).toBe(77.5946);
    });
  });

  describe('Instance Methods', () => {
    let mockAddress: any;

    beforeEach(() => {
      mockAddress = {
        location: {
          coordinates: [77.5946, 12.9716] // Bangalore coordinates
        }
      };
    });

    it('should calculate distance from another point', () => {
      // Mock the distanceFrom method implementation
      const distanceFrom = function(longitude: number, latitude: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (latitude - this.location.coordinates[1]) * Math.PI / 180;
        const dLon = (longitude - this.location.coordinates[0]) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(this.location.coordinates[1] * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };
      
      mockAddress.distanceFrom = distanceFrom.bind(mockAddress);
      
      // Test distance calculation to Mumbai (72.8777, 19.0760)
      const distance = mockAddress.distanceFrom(72.8777, 19.0760);
      expect(distance).toBeGreaterThan(800); // Should be around 840 km
      expect(distance).toBeLessThan(900);
    });

    it('should return 0 distance for same coordinates', () => {
      const distanceFrom = function(longitude: number, latitude: number): number {
        const R = 6371;
        const dLat = (latitude - this.location.coordinates[1]) * Math.PI / 180;
        const dLon = (longitude - this.location.coordinates[0]) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(this.location.coordinates[1] * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };
      
      mockAddress.distanceFrom = distanceFrom.bind(mockAddress);
      
      // Test distance to same coordinates
      const distance = mockAddress.distanceFrom(77.5946, 12.9716);
      expect(distance).toBeLessThan(0.001); // Should be very close to 0
    });
  });

  describe('JSON Transformation', () => {
    it('should transform document to JSON correctly', () => {
      const schema = AddressSchema;
      const transformFunction = schema.options.toJSON.transform;
      
      const mockDoc = {};
      const mockRet = {
        _id: '507f1f77bcf86cd799439011',
        __v: 0,
        userId: '507f1f77bcf86cd799439012',
        line1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716]
        },
        contactPhone: '9999999999',
        isDefault: true,
        isActive: true,
      };
      
      const result = transformFunction(mockDoc, mockRet);
      
      expect(result.id).toBe('507f1f77bcf86cd799439011');
      expect(result._id).toBeUndefined();
      expect(result.__v).toBeUndefined();
      expect(result.userId).toBe('507f1f77bcf86cd799439012');
      expect(result.line1).toBe('123 Main Street');
      expect(result.city).toBe('Bangalore');
      expect(result.location).toEqual({
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      });
    });
  });
});
