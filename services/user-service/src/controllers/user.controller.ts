import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateAddressDto,
  UpdateAddressDto,
  UserProfileDto,
  UpdateWalletBalanceDto,
} from '../dto/user.dto';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto) {
    this.logger.log(`Creating user with phone: ${createUserDto.phone}`);
    const user = await this.userService.create(createUserDto);
    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        isActive: user.isActive,
        monthlyPaymentMode: user.monthlyPaymentMode,
        createdAt: user.createdAt,
      },
    };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    this.logger.log(`Getting user by ID: ${id}`);
    const user = await this.userService.findById(id);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        isActive: user.isActive,
        monthlyPaymentMode: user.monthlyPaymentMode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Get('phone/:phone')
  async getUserByPhone(@Param('phone') phone: string) {
    this.logger.log(`Getting user by phone: ${phone}`);
    const user = await this.userService.findByPhone(phone);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        isActive: user.isActive,
        monthlyPaymentMode: user.monthlyPaymentMode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    this.logger.log(`Updating user: ${id}`);
    const user = await this.userService.update(id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        isActive: user.isActive,
        monthlyPaymentMode: user.monthlyPaymentMode,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string): Promise<{ success: boolean; message: string; data: UserProfileDto }> {
    this.logger.log(`Getting user profile: ${id}`);
    const profile = await this.userService.getUserProfile(id);
    return {
      success: true,
      message: 'User profile retrieved successfully',
      data: profile,
    };
  }

  @Put(':id/wallet')
  async updateWalletBalance(
    @Param('id') id: string,
    @Body() updateWalletDto: UpdateWalletBalanceDto,
  ) {
    this.logger.log(`Updating wallet balance for user: ${id}, amount: ${updateWalletDto.amount}`);
    const user = await this.userService.updateWalletBalance(id, updateWalletDto);
    return {
      success: true,
      message: 'Wallet balance updated successfully',
      data: {
        id: user._id,
        walletBalance: user.walletBalance,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Put(':id/monthly-payment-mode')
  async updateMonthlyPaymentMode(
    @Param('id') id: string,
    @Body() body: { monthlyPaymentMode: boolean },
  ) {
    this.logger.log(`Updating monthly payment mode for user: ${id}`);
    const user = await this.userService.updateMonthlyPaymentMode(id, body.monthlyPaymentMode);
    return {
      success: true,
      message: 'Monthly payment mode updated successfully',
      data: {
        id: user._id,
        monthlyPaymentMode: user.monthlyPaymentMode,
        updatedAt: user.updatedAt,
      },
    };
  }

  // Address management endpoints
  @Post(':id/addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@Param('id') userId: string, @Body() createAddressDto: CreateAddressDto) {
    this.logger.log(`Creating address for user: ${userId}`);
    const address = await this.userService.createAddress(userId, createAddressDto);
    return {
      success: true,
      message: 'Address created successfully',
      data: {
        id: address._id,
        userId: address.userId,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        latitude: address.location.coordinates[1],
        longitude: address.location.coordinates[0],
        isDefault: address.isDefault,
        isActive: address.isActive,
        createdAt: address.createdAt,
      },
    };
  }

  @Get(':id/addresses')
  async getUserAddresses(@Param('id') userId: string) {
    this.logger.log(`Getting addresses for user: ${userId}`);
    const addresses = await this.userService.getUserAddresses(userId);
    return {
      success: true,
      message: 'Addresses retrieved successfully',
      data: addresses.map(address => ({
        id: address._id,
        userId: address.userId,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        latitude: address.location.coordinates[1],
        longitude: address.location.coordinates[0],
        isDefault: address.isDefault,
        isActive: address.isActive,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      })),
    };
  }

  @Put('addresses/:addressId')
  async updateAddress(
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    this.logger.log(`Updating address: ${addressId}`);
    const address = await this.userService.updateAddress(addressId, updateAddressDto);
    return {
      success: true,
      message: 'Address updated successfully',
      data: {
        id: address._id,
        userId: address.userId,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        latitude: address.location.coordinates[1],
        longitude: address.location.coordinates[0],
        isDefault: address.isDefault,
        isActive: address.isActive,
        updatedAt: address.updatedAt,
      },
    };
  }

  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Param('addressId') addressId: string) {
    this.logger.log(`Deleting address: ${addressId}`);
    await this.userService.deleteAddress(addressId);
    return {
      success: true,
      message: 'Address deleted successfully',
    };
  }

  // Development endpoint for seeding test data
  @Post('seed-test-data')
  @HttpCode(HttpStatus.CREATED)
  async seedTestData() {
    this.logger.log('Seeding test data');
    await this.userService.seedTestData();
    return {
      success: true,
      message: 'Test data seeded successfully',
    };
  }
}
