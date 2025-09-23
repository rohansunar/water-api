import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';
import { Customer, CustomerDocument } from '../common/schemas/customer.schema';
import { Address, AddressDocument } from '../common/schemas/address.schema';
import { UserRole, CustomerRole } from '../common/interfaces/user.interface';
import { UserProfileDto, CustomerProfileDto } from '../common/dto/auth.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding user by ID ${id}:`, error);
      return null;
    }
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ phone }).exec();
    } catch (error) {
      this.logger.error(`Error finding user by phone ${phone}:`, error);
      return null;
    }
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    try {
      const user = new this.userModel({
        phone: userData.phone,
        name: userData.name,
        email: userData.email,
        addresses: userData.addresses || [],
        walletBalance: userData.walletBalance || 0,
        role: userData.role || UserRole.CUSTOMER,
        isActive: userData.isActive !== false,
        monthlyPaymentMode: userData.monthlyPaymentMode || false,
      });

      const savedUser = await user.save();
      this.logger.log(
        `Created new user: ${savedUser._id} with phone: ${savedUser.phone}`,
      );
      return savedUser;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, updateData: Partial<User>): Promise<UserDocument> {
    try {
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

      this.logger.log(`Updated user: ${id}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get separate address documents for this user
    const addresses = await this.addressModel
      .find({ userId: user._id, isActive: true })
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
          type: addr.label || 'home',
          street: addr.street,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          landmark: addr.landmark,
          latitude: addr.latitude,
          longitude: addr.longitude,
          isDefault: addr.isDefault,
        })),
        // Include separate address documents
        ...addresses.map((addr) => ({
          id: addr._id.toString(),
          type: addr.label || 'home',
          street: addr.line1,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          landmark: addr.landmark,
          latitude: addr.location?.coordinates[1] || 0,
          longitude: addr.location?.coordinates[0] || 0,
          isDefault: addr.isDefault,
        })),
      ],
      createdAt: user.createdAt,
    };
  }

  async updateWalletBalance(
    userId: string,
    amount: number,
  ): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.walletBalance += amount;
      user.updatedAt = new Date();

      const updatedUser = await user.save();
      this.logger.log(
        `Updated wallet balance for user ${userId}: ${updatedUser.walletBalance}`,
      );
      return updatedUser;
    } catch (error) {
      this.logger.error(
        `Error updating wallet balance for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateMonthlyPaymentMode(
    userId: string,
    monthlyPaymentMode: boolean,
  ): Promise<UserDocument> {
    try {
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

      this.logger.log(
        `Updated monthly payment mode for user ${userId}: ${monthlyPaymentMode}`,
      );
      return updatedUser;
    } catch (error) {
      this.logger.error(
        `Error updating monthly payment mode for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // Address management methods
  async createAddress(
    userId: string,
    addressData: any,
  ): Promise<AddressDocument> {
    try {
      const address = new this.addressModel({
        userId: new Types.ObjectId(userId),
        ...addressData,
      });

      const savedAddress = await address.save();
      this.logger.log(
        `Created address for user ${userId}: ${savedAddress._id}`,
      );
      return savedAddress;
    } catch (error) {
      this.logger.error(`Error creating address for user ${userId}:`, error);
      throw error;
    }
  }

  async getUserAddresses(userId: string): Promise<AddressDocument[]> {
    try {
      return await this.addressModel.find({ userId, isActive: true }).exec();
    } catch (error) {
      this.logger.error(`Error getting addresses for user ${userId}:`, error);
      throw error;
    }
  }

  async updateAddress(
    addressId: string,
    updateData: any,
  ): Promise<AddressDocument> {
    try {
      const updatedAddress = await this.addressModel
        .findByIdAndUpdate(
          addressId,
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedAddress) {
        throw new NotFoundException('Address not found');
      }

      return updatedAddress;
    } catch (error) {
      this.logger.error(`Error updating address ${addressId}:`, error);
      throw error;
    }
  }

  // For development - seed some test data
  async seedTestData(): Promise<void> {
    try {
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
        const existingUser = await this.findByPhone(userData.phone);
        if (!existingUser) {
          await this.create(userData);
        }
      }

      this.logger.log('Test data seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding test data:', error);
      throw error;
    }
  }
}
