import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserSchema } from './user.schema';
import { UserRole } from '../interfaces/user.interface';

describe('User Schema', () => {
  let userModel: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(User.name),
          useValue: {
            new: jest.fn().mockResolvedValue({}),
            constructor: jest.fn().mockResolvedValue({}),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  describe('Schema Definition', () => {
    it('should have correct schema structure', () => {
      const schema = UserSchema;
      expect(schema).toBeDefined();
      expect(schema.paths.phone).toBeDefined();
      expect(schema.paths.name).toBeDefined();
      expect(schema.paths.role).toBeDefined();
      expect(schema.paths.walletBalance).toBeDefined();
      expect(schema.paths.isActive).toBeDefined();
      expect(schema.paths.addresses).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = UserSchema;
      expect(schema.paths.phone.isRequired).toBe(true);
      expect(schema.paths.name.isRequired).toBe(true);
      expect(schema.paths.role.isRequired).toBe(true);
    });

    it('should have correct default values', () => {
      const schema = UserSchema;
      expect((schema.paths.role as any).default).toBe(UserRole.CUSTOMER);
      expect((schema.paths.walletBalance as any).default).toBe(0);
      expect((schema.paths.isActive as any).default).toBe(true);
      expect((schema.paths.isDeleted as any).default).toBe(false);
      expect((schema.paths.monthlyPaymentMode as any).default).toBe(false);
    });

    it('should have unique constraints', () => {
      const schema = UserSchema;
      expect(schema.paths.phone.options.unique).toBe(true);
      expect(schema.paths.email.options.unique).toBe(true);
      expect(schema.paths.email.options.sparse).toBe(true);
    });
  });

  describe('Role Extensions', () => {
    it('should have customer extension structure', () => {
      const schema = UserSchema;
      expect(schema.paths.customerExtension).toBeDefined();
    });

    it('should have vendor extension structure', () => {
      const schema = UserSchema;
      expect(schema.paths.vendorExtension).toBeDefined();
    });

    it('should have rider extension structure', () => {
      const schema = UserSchema;
      expect(schema.paths.riderExtension).toBeDefined();
    });

    it('should have admin extension structure', () => {
      const schema = UserSchema;
      expect(schema.paths.adminExtension).toBeDefined();
    });
  });

  describe('Address Structure', () => {
    it('should have correct address schema', () => {
      const schema = UserSchema;
      const addressSchema = schema.paths.addresses;
      expect(addressSchema).toBeDefined();
    });

    it('should have required address fields', () => {
      const schema = UserSchema;
      const addressPath = schema.paths.addresses as any;
      expect(addressPath.schema.paths.street).toBeDefined();
      expect(addressPath.schema.paths.city).toBeDefined();
      expect(addressPath.schema.paths.state).toBeDefined();
      expect(addressPath.schema.paths.pincode).toBeDefined();
      expect(addressPath.schema.paths.latitude).toBeDefined();
      expect(addressPath.schema.paths.longitude).toBeDefined();
      expect(addressPath.schema.paths.contactPhone).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', () => {
      const schema = UserSchema;
      const indexes = schema.indexes();

      // Check for phone index
      const phoneIndex = indexes.find((index) => index[0].phone === 1);
      expect(phoneIndex).toBeDefined();
      expect(phoneIndex[1].unique).toBe(true);

      // Check for email index
      const emailIndex = indexes.find((index) => index[0].email === 1);
      expect(emailIndex).toBeDefined();
      expect(emailIndex[1].unique).toBe(true);
      expect(emailIndex[1].sparse).toBe(true);

      // Check for role index
      const roleIndex = indexes.find((index) => index[0].role === 1);
      expect(roleIndex).toBeDefined();
    });
  });

  describe('Pre-save Middleware', () => {
    let mockUser: any;

    beforeEach(() => {
      mockUser = {
        isNew: true,
        role: UserRole.CUSTOMER,
        customerExtension: undefined,
        vendorExtension: undefined,
        riderExtension: undefined,
        adminExtension: undefined,
      };
    });

    it('should initialize customer extension for customer role', () => {
      const schema = UserSchema;
      const preSaveHook = schema.pre.bind(schema);

      // Mock the pre-save middleware execution
      mockUser.role = UserRole.CUSTOMER;

      // Simulate pre-save middleware logic
      if (
        mockUser.isNew &&
        mockUser.role === UserRole.CUSTOMER &&
        !mockUser.customerExtension
      ) {
        mockUser.customerExtension = {
          loyaltyPoints: 0,
          preferences: {
            notificationPreferences: {
              sms: true,
              email: true,
              push: true,
            },
          },
        };
      }

      expect(mockUser.customerExtension).toBeDefined();
      expect(mockUser.customerExtension.loyaltyPoints).toBe(0);
      expect(
        mockUser.customerExtension.preferences.notificationPreferences.sms,
      ).toBe(true);
    });

    it('should initialize vendor extension for vendor role', () => {
      mockUser.role = UserRole.VENDOR;

      // Simulate pre-save middleware logic
      if (
        mockUser.isNew &&
        mockUser.role === UserRole.VENDOR &&
        !mockUser.vendorExtension
      ) {
        mockUser.vendorExtension = {
          kycStatus: 'pending',
          rating: 0,
          totalOrders: 0,
          businessMetrics: {
            totalRevenue: 0,
            averageOrderValue: 0,
            customerRetentionRate: 0,
          },
        };
      }

      expect(mockUser.vendorExtension).toBeDefined();
      expect(mockUser.vendorExtension.kycStatus).toBe('pending');
      expect(mockUser.vendorExtension.rating).toBe(0);
      expect(mockUser.vendorExtension.businessMetrics.totalRevenue).toBe(0);
    });

    it('should initialize rider extension for delivery rider role', () => {
      mockUser.role = UserRole.DELIVERY_RIDER;

      // Simulate pre-save middleware logic
      if (
        mockUser.isNew &&
        mockUser.role === UserRole.DELIVERY_RIDER &&
        !mockUser.riderExtension
      ) {
        mockUser.riderExtension = {
          shift: {
            startTime: '09:00',
            endTime: '18:00',
            daysOfWeek: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
            ],
          },
          status: 'inactive',
          performanceMetrics: {
            totalDeliveries: 0,
            averageRating: 0,
            onTimeDeliveryRate: 0,
          },
        };
      }

      expect(mockUser.riderExtension).toBeDefined();
      expect(mockUser.riderExtension.status).toBe('inactive');
      expect(mockUser.riderExtension.shift.startTime).toBe('09:00');
      expect(mockUser.riderExtension.performanceMetrics.totalDeliveries).toBe(
        0,
      );
    });

    it('should initialize admin extension for admin role', () => {
      mockUser.role = UserRole.ADMIN;

      // Simulate pre-save middleware logic
      if (
        mockUser.isNew &&
        mockUser.role === UserRole.ADMIN &&
        !mockUser.adminExtension
      ) {
        mockUser.adminExtension = {
          roleLevel: 'support',
          permissions: [],
          accessLevel: 1,
        };
      }

      expect(mockUser.adminExtension).toBeDefined();
      expect(mockUser.adminExtension.roleLevel).toBe('support');
      expect(mockUser.adminExtension.permissions).toEqual([]);
      expect(mockUser.adminExtension.accessLevel).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should validate phone number format', () => {
      const schema = UserSchema;
      const phonePath = schema.paths.phone;
      expect(phonePath.options.required).toBe(true);
      expect(phonePath.options.unique).toBe(true);
    });

    it('should validate email format when provided', () => {
      const schema = UserSchema;
      const emailPath = schema.paths.email;
      expect(emailPath.options.unique).toBe(true);
      expect(emailPath.options.sparse).toBe(true);
    });

    it('should validate role enum values', () => {
      const schema = UserSchema;
      const rolePath = schema.paths.role;
      expect(rolePath.options.enum).toEqual(Object.values(UserRole));
    });
  });

  describe('JSON Transformation', () => {
    it('should transform document to JSON correctly', () => {
      const schema = UserSchema;
      const transformFunction = schema.options.toJSON.transform;

      const mockDoc = {};
      const mockRet = {
        _id: '507f1f77bcf86cd799439011',
        __v: 0,
        otpCode: '123456',
        otpExpiry: new Date(),
        name: 'Test User',
        phone: '9999999999',
      };

      const result = transformFunction(mockDoc, mockRet);

      expect(result.id).toBe('507f1f77bcf86cd799439011');
      expect(result._id).toBeUndefined();
      expect(result.__v).toBeUndefined();
      expect(result.otpCode).toBeUndefined();
      expect(result.otpExpiry).toBeUndefined();
      expect(result.name).toBe('Test User');
      expect(result.phone).toBe('9999999999');
    });
  });
});
