import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseModuleService } from '../../../common/base/base-module.service';
import { CustomLoggerService } from '../../../common/logger/logger.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import {
  User,
  UserDocument,
  UserAddress,
  UserAddressDocument,
  UserRole,
} from '../entities/user.entity';
import {
  IUserModuleService,
  UserCreatedEventData,
  UserUpdatedEventData,
  WalletBalanceUpdatedEventData,
} from '../interfaces/user-service.interface';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateAddressDto,
  UpdateAddressDto,
  UserProfileDto,
} from '../dto/user.dto';
import {
  UserData,
  CreateUserData,
} from '../../../common/interfaces/module-communication.interface';
import { EventTypes } from '../../../common/events/event-bus.interface';

@Injectable()
export class UserService
  extends BaseModuleService
  implements IUserModuleService
{
  constructor(
    protected readonly logger: CustomLoggerService,
    protected readonly eventBus: EventBusService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserAddress.name)
    private addressModel: Model<UserAddressDocument>,
  ) {
    super(logger, eventBus, 'user-module');
  }

  async findById(id: string): Promise<UserData | null> {
    return this.executeWithTracking('findById', async () => {
      this.validateRequired({ id }, ['id']);

      const user = await this.userModel.findById(id).exec();
      return user ? this.mapToUserData(user) : null;
    });
  }

  async findByEmail(email: string): Promise<UserData | null> {
    return this.executeWithTracking('findByEmail', async () => {
      this.validateRequired({ email }, ['email']);

      const user = await this.userModel.findOne({ email }).exec();
      return user ? this.mapToUserData(user) : null;
    });
  }

  async findByPhone(phone: string): Promise<UserData | null> {
    return this.executeWithTracking('findByPhone', async () => {
      this.validateRequired({ phone }, ['phone']);

      const user = await this.userModel.findOne({ phone }).exec();
      return user ? this.mapToUserData(user) : null;
    });
  }

  // Extended methods for internal use
  async findByEmailDocument(email: string): Promise<UserDocument | null> {
    return this.executeWithTracking('findByEmailDocument', async () => {
      this.validateRequired({ email }, ['email']);

      return await this.userModel.findOne({ email }).exec();
    });
  }

  async findByPhoneDocument(phone: string): Promise<UserDocument | null> {
    return this.executeWithTracking('findByPhoneDocument', async () => {
      this.validateRequired({ phone }, ['phone']);

      return await this.userModel.findOne({ phone }).exec();
    });
  }

  async validateUser(id: string): Promise<boolean> {
    return this.executeWithTracking('validateUser', async () => {
      const user = await this.userModel.findById(id).select('isActive').exec();
      return user ? user.isActive : false;
    });
  }

  async createUser(userData: CreateUserData): Promise<UserData> {
    return this.executeWithTracking('createUser', async () => {
      this.validateRequired(userData, ['email', 'phone', 'role']);

      // Check if user already exists
      const existingUser = await this.userModel
        .findOne({
          $or: [{ email: userData.email }, { phone: userData.phone }],
        })
        .exec();

      if (existingUser) {
        throw new BadRequestException(
          'User with this email or phone already exists',
        );
      }

      const user = new this.userModel({
        ...userData,
        isActive: true,
        walletBalance: 0,
        monthlyPaymentMode: false,
      });

      const savedUser = await user.save();

      // Publish event
      await this.publishEvent(EventTypes.USER_CREATED, {
        userId: savedUser._id.toString(),
        phone: savedUser.phone,
        email: savedUser.email,
        role: savedUser.role,
        name: savedUser.name,
      } as UserCreatedEventData);

      return this.mapToUserData(savedUser);
    });
  }

  async updateUser(
    id: string,
    updateData: Partial<UserData>,
  ): Promise<UserData> {
    return this.executeWithTracking('updateUser', async () => {
      this.validateRequired({ id }, ['id']);

      const existingUser = await this.userModel.findById(id).exec();
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const previousValues = {
        name: existingUser.name,
        email: existingUser.email,
        isActive: existingUser.isActive,
        monthlyPaymentMode: existingUser.monthlyPaymentMode,
      };

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      // Publish event
      await this.publishEvent(EventTypes.USER_UPDATED, {
        userId: id,
        changes: updateData,
        previousValues,
      } as UserUpdatedEventData);

      return this.mapToUserData(updatedUser);
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.executeWithTracking('deleteUser', async () => {
      this.validateRequired({ id }, ['id']);

      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Soft delete by setting isActive to false
      await this.userModel
        .findByIdAndUpdate(id, {
          isActive: false,
          updatedAt: new Date(),
        })
        .exec();

      // Also delete user addresses
      await this.addressModel
        .updateMany(
          { userId: new Types.ObjectId(id) },
          { isActive: false, updatedAt: new Date() },
        )
        .exec();

      // Publish event
      await this.publishEvent(EventTypes.USER_DELETED, {
        userId: id,
        phone: user.phone,
        role: user.role,
        deletedAt: new Date(),
      });
    });
  }

  // Alias for interface compatibility
  async delete(id: string): Promise<void> {
    return this.deleteUser(id);
  }

  // Extended methods specific to User module
  async create(userData: CreateUserDto): Promise<UserDocument> {
    return this.executeWithTracking('create', async () => {
      this.validateRequired(userData, ['phone']);

      const user = new this.userModel({
        phone: userData.phone,
        name: userData.name,
        email: userData.email,
        role: userData.role || UserRole.CUSTOMER,
        walletBalance: userData.walletBalance || 0,
        isActive: userData.isActive !== false,
        monthlyPaymentMode: userData.monthlyPaymentMode || false,
      });

      const savedUser = await user.save();

      // Publish event
      await this.publishEvent(EventTypes.USER_CREATED, {
        userId: savedUser._id.toString(),
        phone: savedUser.phone,
        email: savedUser.email,
        role: savedUser.role,
        name: savedUser.name,
      } as UserCreatedEventData);

      return savedUser;
    });
  }

  async update(id: string, updateData: UpdateUserDto): Promise<UserDocument> {
    return this.executeWithTracking('update', async () => {
      this.validateRequired({ id }, ['id']);

      const existingUser = await this.userModel.findById(id).exec();
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    });
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    return this.executeWithTracking('getUserProfile', async () => {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const addresses = await this.addressModel
        .find({
          userId: new Types.ObjectId(userId),
          isActive: true,
        })
        .exec();

      return {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        isActive: user.isActive,
        monthlyPaymentMode: user.monthlyPaymentMode,
        addresses: [
          // Include embedded addresses
          ...user.addresses.map((addr: any) => ({
            id: addr._id?.toString() || '',
            street: addr.street,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            landmark: addr.landmark,
            latitude: addr.latitude,
            longitude: addr.longitude,
            label: addr.label,
            isDefault: addr.isDefault,
          })),
          // Include separate address documents
          ...addresses.map((addr) => ({
            id: addr._id.toString(),
            street: addr.line1,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            landmark: addr.landmark,
            latitude: addr.location?.coordinates[1] || 0,
            longitude: addr.location?.coordinates[0] || 0,
            label: addr.label,
            isDefault: addr.isDefault,
          })),
        ],
        createdAt: user.createdAt,
      };
    });
  }

  async updateWalletBalance(
    userId: string,
    amount: number,
    description?: string,
  ): Promise<UserDocument> {
    return this.executeWithTracking('updateWalletBalance', async () => {
      this.validateRequired({ userId, amount }, ['userId', 'amount']);

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const previousBalance = user.walletBalance;
      user.walletBalance += amount;
      user.updatedAt = new Date();

      const updatedUser = await user.save();

      // Publish event
      await this.publishEvent(EventTypes.WALLET_TOPPED_UP, {
        userId,
        previousBalance,
        newBalance: updatedUser.walletBalance,
        amount,
        description,
      } as WalletBalanceUpdatedEventData);

      return updatedUser;
    });
  }

  async updateMonthlyPaymentMode(
    userId: string,
    monthlyPaymentMode: boolean,
  ): Promise<UserDocument> {
    return this.executeWithTracking('updateMonthlyPaymentMode', async () => {
      this.validateRequired({ userId, monthlyPaymentMode }, [
        'userId',
        'monthlyPaymentMode',
      ]);

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { monthlyPaymentMode, updatedAt: new Date() },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    });
  }

  // Helper method to map UserDocument to UserData
  private mapToUserData(user: UserDocument): UserData {
    return {
      id: user._id.toString(),
      email: user.email || '',
      phone: user.phone,
      role: user.role as 'customer' | 'vendor' | 'agent' | 'admin',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Address management methods
  async createAddress(
    userId: string,
    addressData: CreateAddressDto,
  ): Promise<UserAddressDocument> {
    return this.executeWithTracking('createAddress', async () => {
      this.validateRequired({ userId }, ['userId']);
      this.validateRequired(addressData, ['line1', 'city', 'state', 'pincode']);

      // Verify user exists
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const address = new this.addressModel({
        userId: new Types.ObjectId(userId),
        ...addressData,
        location: {
          type: 'Point',
          coordinates: [addressData.longitude || 0, addressData.latitude || 0],
        },
      });

      const savedAddress = await address.save();

      // Publish event
      await this.publishEvent('address.created', {
        userId,
        addressId: savedAddress._id.toString(),
        isDefault: savedAddress.isDefault,
      });

      return savedAddress;
    });
  }

  async getUserAddresses(userId: string): Promise<UserAddressDocument[]> {
    return this.executeWithTracking('getUserAddresses', async () => {
      this.validateRequired({ userId }, ['userId']);

      return await this.addressModel
        .find({
          userId: new Types.ObjectId(userId),
          isActive: true,
        })
        .exec();
    });
  }

  async updateAddress(
    addressId: string,
    updateData: UpdateAddressDto,
  ): Promise<UserAddressDocument> {
    return this.executeWithTracking('updateAddress', async () => {
      this.validateRequired({ addressId }, ['addressId']);

      const updateFields: any = { ...updateData, updatedAt: new Date() };

      if (
        updateData.latitude !== undefined ||
        updateData.longitude !== undefined
      ) {
        updateFields.location = {
          type: 'Point',
          coordinates: [updateData.longitude || 0, updateData.latitude || 0],
        };
      }

      const updatedAddress = await this.addressModel
        .findByIdAndUpdate(addressId, updateFields, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedAddress) {
        throw new NotFoundException('Address not found');
      }

      return updatedAddress;
    });
  }

  async deleteAddress(addressId: string): Promise<void> {
    return this.executeWithTracking('deleteAddress', async () => {
      this.validateRequired({ addressId }, ['addressId']);

      const address = await this.addressModel.findById(addressId).exec();
      if (!address) {
        throw new NotFoundException('Address not found');
      }

      // Soft delete
      await this.addressModel
        .findByIdAndUpdate(addressId, {
          isActive: false,
          updatedAt: new Date(),
        })
        .exec();

      // Publish event
      await this.publishEvent('address.deleted', {
        userId: address.userId.toString(),
        addressId,
        wasDefault: address.isDefault,
      });
    });
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    return this.executeWithTracking('setDefaultAddress', async () => {
      this.validateRequired({ userId, addressId }, ['userId', 'addressId']);

      // Remove default from all user addresses
      await this.addressModel
        .updateMany(
          { userId: new Types.ObjectId(userId) },
          { isDefault: false, updatedAt: new Date() },
        )
        .exec();

      // Set new default
      const updatedAddress = await this.addressModel
        .findByIdAndUpdate(
          addressId,
          { isDefault: true, updatedAt: new Date() },
          { new: true },
        )
        .exec();

      if (!updatedAddress) {
        throw new NotFoundException('Address not found');
      }
    });
  }

  // Query methods
  async findByRole(role: string): Promise<UserDocument[]> {
    return this.executeWithTracking('findByRole', async () => {
      return await this.userModel.find({ role, isActive: true }).exec();
    });
  }

  async findActiveUsers(): Promise<UserDocument[]> {
    return this.executeWithTracking('findActiveUsers', async () => {
      return await this.userModel.find({ isActive: true }).exec();
    });
  }

  async searchUsers(
    query: string,
    limit: number = 10,
  ): Promise<UserDocument[]> {
    return this.executeWithTracking('searchUsers', async () => {
      const searchRegex = new RegExp(query, 'i');
      return await this.userModel
        .find({
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
          ],
          isActive: true,
        })
        .limit(limit)
        .exec();
    });
  }

  // Validation methods
  async validateUserExists(id: string): Promise<boolean> {
    return this.executeWithTracking('validateUserExists', async () => {
      const user = await this.userModel.findById(id).select('_id').exec();
      return !!user;
    });
  }

  async validateUserActive(id: string): Promise<boolean> {
    return this.executeWithTracking('validateUserActive', async () => {
      const user = await this.userModel.findById(id).select('isActive').exec();
      return user ? user.isActive : false;
    });
  }

  async validateUserRole(id: string, role: string): Promise<boolean> {
    return this.executeWithTracking('validateUserRole', async () => {
      const user = await this.userModel.findById(id).select('role').exec();
      return user ? user.role === role : false;
    });
  }

  // Statistics
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
    recentSignups: number;
  }> {
    return this.executeWithTracking('getUserStats', async () => {
      const [totalUsers, activeUsers, usersByRole, recentSignups] =
        await Promise.all([
          this.userModel.countDocuments().exec(),
          this.userModel.countDocuments({ isActive: true }).exec(),
          this.userModel
            .aggregate([
              { $group: { _id: '$role', count: { $sum: 1 } } },
              { $project: { role: '$_id', count: 1, _id: 0 } },
            ])
            .exec(),
          this.userModel
            .countDocuments({
              createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            })
            .exec(),
        ]);

      const roleStats = usersByRole.reduce(
        (acc, item) => {
          acc[item.role] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        totalUsers,
        activeUsers,
        usersByRole: roleStats,
        recentSignups,
      };
    });
  }

  // Development/Testing methods
  async seedTestData(): Promise<void> {
    return this.executeWithTracking('seedTestData', async () => {
      const testUsers = [
        {
          phone: '9999999999',
          name: 'Test Customer',
          role: UserRole.CUSTOMER,
          walletBalance: 500,
        },
        {
          phone: '8888888888',
          name: 'Test Vendor',
          role: UserRole.VENDOR,
          walletBalance: 1000,
        },
        {
          phone: '7777777777',
          name: 'Test Agent',
          role: UserRole.DELIVERY_RIDER,
          walletBalance: 200,
        },
      ];

      for (const userData of testUsers) {
        const existingUser = await this.userModel
          .findOne({ phone: userData.phone })
          .exec();
        if (!existingUser) {
          await this.create(userData as CreateUserDto);
        }
      }
    });
  }

  async clearTestData(): Promise<void> {
    return this.executeWithTracking('clearTestData', async () => {
      const testPhones = ['9999999999', '8888888888', '7777777777'];
      await this.userModel.deleteMany({ phone: { $in: testPhones } }).exec();

      // Also clear test addresses
      const testUsers = await this.userModel
        .find({ phone: { $in: testPhones } })
        .select('_id')
        .exec();
      const testUserIds = testUsers.map((user) => user._id);
      await this.addressModel
        .deleteMany({ userId: { $in: testUserIds } })
        .exec();
    });
  }

  protected async checkDependencies(): Promise<{
    database: 'connected' | 'disconnected';
    externalServices: 'available' | 'unavailable';
  }> {
    try {
      // Test database connection
      await this.userModel.findOne().limit(1).exec();
      return {
        database: 'connected',
        externalServices: 'available',
      };
    } catch (error) {
      return {
        database: 'disconnected',
        externalServices: 'unavailable',
      };
    }
  }
}
