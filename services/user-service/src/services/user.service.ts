import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Address, AddressDocument } from '../schemas/address.schema';
import { UserRole } from '../interfaces/user.interface';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  CreateAddressDto, 
  UpdateAddressDto, 
  UserProfileDto,
  UpdateWalletBalanceDto 
} from '../dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
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

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      // Check if user already exists
      const existingUser = await this.findByPhone(createUserDto.phone);
      if (existingUser) {
        throw new BadRequestException('User with this phone number already exists');
      }

      const user = new this.userModel({
        phone: createUserDto.phone,
        name: createUserDto.name,
        email: createUserDto.email,
        role: createUserDto.role || UserRole.CUSTOMER,
        walletBalance: createUserDto.walletBalance || 0,
        monthlyPaymentMode: createUserDto.monthlyPaymentMode || false,
        isActive: true,
      });

      const savedUser = await user.save();
      this.logger.log(`Created new user: ${savedUser._id} with phone: ${savedUser.phone}`);
      return savedUser;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          { ...updateUserDto, updatedAt: new Date() },
          { new: true, runValidators: true }
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
    const addresses = await this.addressModel.find({ userId: user._id, isActive: true }).exec();

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

  async updateWalletBalance(userId: string, updateWalletDto: UpdateWalletBalanceDto): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const newBalance = user.walletBalance + updateWalletDto.amount;
      if (newBalance < 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      user.walletBalance = newBalance;
      user.updatedAt = new Date();

      const updatedUser = await user.save();
      this.logger.log(
        `Updated wallet balance for user ${userId}: ${updatedUser.walletBalance}`,
      );
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating wallet balance for user ${userId}:`, error);
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
          { new: true, runValidators: true }
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
      this.logger.error(`Error updating monthly payment mode for user ${userId}:`, error);
      throw error;
    }
  }

  // Address management methods
  async createAddress(userId: string, createAddressDto: CreateAddressDto): Promise<AddressDocument> {
    try {
      // Verify user exists
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // If this is set as default, unset other default addresses
      if (createAddressDto.isDefault) {
        await this.addressModel.updateMany(
          { userId: new Types.ObjectId(userId) },
          { isDefault: false }
        );
      }

      const address = new this.addressModel({
        userId: new Types.ObjectId(userId),
        ...createAddressDto,
        location: {
          type: 'Point',
          coordinates: [createAddressDto.longitude, createAddressDto.latitude]
        }
      });

      const savedAddress = await address.save();
      this.logger.log(`Created address for user ${userId}: ${savedAddress._id}`);
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

  async updateAddress(addressId: string, updateAddressDto: UpdateAddressDto): Promise<AddressDocument> {
    try {
      const updateData: any = { ...updateAddressDto, updatedAt: new Date() };
      
      // Update location if coordinates are provided
      if (updateAddressDto.latitude !== undefined && updateAddressDto.longitude !== undefined) {
        updateData.location = {
          type: 'Point',
          coordinates: [updateAddressDto.longitude, updateAddressDto.latitude]
        };
      }

      const updatedAddress = await this.addressModel
        .findByIdAndUpdate(addressId, updateData, { new: true, runValidators: true })
        .exec();

      if (!updatedAddress) {
        throw new NotFoundException('Address not found');
      }

      // If this is set as default, unset other default addresses for the same user
      if (updateAddressDto.isDefault) {
        await this.addressModel.updateMany(
          { userId: updatedAddress.userId, _id: { $ne: addressId } },
          { isDefault: false }
        );
      }

      return updatedAddress;
    } catch (error) {
      this.logger.error(`Error updating address ${addressId}:`, error);
      throw error;
    }
  }

  async deleteAddress(addressId: string): Promise<void> {
    try {
      const result = await this.addressModel
        .findByIdAndUpdate(addressId, { isActive: false, updatedAt: new Date() })
        .exec();

      if (!result) {
        throw new NotFoundException('Address not found');
      }

      this.logger.log(`Deleted address: ${addressId}`);
    } catch (error) {
      this.logger.error(`Error deleting address ${addressId}:`, error);
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
          role: UserRole.DELIVERY_AGENT,
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
