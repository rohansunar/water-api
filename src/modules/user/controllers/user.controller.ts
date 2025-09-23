import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../common/interfaces/user.interface';
import { UserService } from '../services/user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateAddressDto,
  UpdateAddressDto,
  UserProfileDto,
  UserResponseDto,
  AddressResponseDto,
  UpdateWalletBalanceDto,
  UpdateMonthlyPaymentModeDto,
} from '../dto/user.dto';
import { CustomLoggerService } from '../../../common/logger/logger.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: CustomLoggerService,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(
    @CurrentUser('userId') userId: string,
  ): Promise<UserProfileDto> {
    this.logger.logApiRequest('GET', '/users/me', HttpStatus.OK, 0, { userId });
    return await this.userService.getUserProfile(userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateCurrentUser(
    @CurrentUser('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const startTime = Date.now();

    try {
      const updatedUser = await this.userService.update(userId, updateUserDto);
      const duration = Date.now() - startTime;

      this.logger.logApiRequest('PUT', '/users/me', HttpStatus.OK, duration, {
        userId,
      });

      return {
        id: updatedUser._id.toString(),
        phone: updatedUser.phone,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        walletBalance: updatedUser.walletBalance,
        isActive: updatedUser.isActive,
        monthlyPaymentMode: updatedUser.monthlyPaymentMode,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/users/me',
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        userId,
      );
      throw error;
    }
  }

  @Put('monthly-payment-mode')
  @HttpCode(HttpStatus.OK)
  async updateMonthlyPaymentMode(
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdateMonthlyPaymentModeDto,
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      await this.userService.updateMonthlyPaymentMode(
        userId,
        updateDto.monthlyPaymentMode,
      );
      const duration = Date.now() - startTime;

      this.logger.logApiRequest(
        'PUT',
        '/users/monthly-payment-mode',
        HttpStatus.OK,
        duration,
        { userId },
      );

      return {
        success: true,
        message: 'Monthly payment mode updated successfully',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/users/monthly-payment-mode',
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        userId,
      );
      throw error;
    }
  }

  // Address management endpoints
  @Get('me/addresses')
  @HttpCode(HttpStatus.OK)
  async getUserAddresses(
    @CurrentUser('userId') userId: string,
  ): Promise<AddressResponseDto[]> {
    const startTime = Date.now();

    try {
      const addresses = await this.userService.getUserAddresses(userId);
      const duration = Date.now() - startTime;

      this.logger.logApiRequest(
        'GET',
        '/users/me/addresses',
        HttpStatus.OK,
        duration,
        { userId },
      );

      return addresses.map((address) => ({
        id: address._id.toString(),
        userId: address.userId.toString(),
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        label: address.label,
        isDefault: address.isDefault,
        isActive: address.isActive,
        latitude: address.location?.coordinates[1],
        longitude: address.location?.coordinates[0],
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/users/me/addresses',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        userId,
      );
      throw error;
    }
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(
    @CurrentUser('userId') userId: string,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    const startTime = Date.now();

    try {
      const address = await this.userService.createAddress(
        userId,
        createAddressDto,
      );
      const duration = Date.now() - startTime;

      this.logger.logApiRequest(
        'POST',
        '/users/me/addresses',
        HttpStatus.CREATED,
        duration,
        { userId },
      );

      return {
        id: address._id.toString(),
        userId: address.userId.toString(),
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        label: address.label,
        isDefault: address.isDefault,
        isActive: address.isActive,
        latitude: address.location?.coordinates[1],
        longitude: address.location?.coordinates[0],
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/users/me/addresses',
        'POST',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        userId,
      );
      throw error;
    }
  }

  @Put('me/addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  async updateAddress(
    @CurrentUser('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const startTime = Date.now();

    try {
      const address = await this.userService.updateAddress(
        addressId,
        updateAddressDto,
      );
      const duration = Date.now() - startTime;

      this.logger.logApiRequest(
        'PUT',
        `/users/me/addresses/${addressId}`,
        HttpStatus.OK,
        duration,
        { userId },
      );

      return {
        id: address._id.toString(),
        userId: address.userId.toString(),
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        label: address.label,
        isDefault: address.isDefault,
        isActive: address.isActive,
        latitude: address.location?.coordinates[1],
        longitude: address.location?.coordinates[0],
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/users/me/addresses/${addressId}`,
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        userId,
      );
      throw error;
    }
  }

  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @CurrentUser('userId') userId: string,
    @Param('addressId') addressId: string,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await this.userService.deleteAddress(addressId);
      const duration = Date.now() - startTime;

      this.logger.logApiRequest(
        'DELETE',
        `/users/me/addresses/${addressId}`,
        HttpStatus.NO_CONTENT,
        duration,
        { userId },
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/users/me/addresses/${addressId}`,
        'DELETE',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        userId,
      );
      throw error;
    }
  }

  @Put('me/addresses/:addressId/default')
  @HttpCode(HttpStatus.OK)
  async setDefaultAddress(
    @CurrentUser('userId') userId: string,
    @Param('addressId') addressId: string,
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      await this.userService.setDefaultAddress(userId, addressId);
      const duration = Date.now() - startTime;

      this.logger.logApiRequest(
        'PUT',
        `/users/me/addresses/${addressId}/default`,
        HttpStatus.OK,
        duration,
        { userId },
      );

      return {
        success: true,
        message: 'Default address updated successfully',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/users/me/addresses/${addressId}/default`,
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        userId,
      );
      throw error;
    }
  }

  // Admin endpoints
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ): Promise<UserResponseDto[]> {
    const startTime = Date.now();

    try {
      let users;

      if (search) {
        users = await this.userService.searchUsers(
          search,
          parseInt(limit || '10'),
        );
      } else if (role) {
        users = await this.userService.findByRole(role);
      } else {
        users = await this.userService.findActiveUsers();
      }

      const duration = Date.now() - startTime;
      this.logger.logApiRequest('GET', '/users', HttpStatus.OK, duration);

      return users.map((user) => ({
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        isActive: user.isActive,
        monthlyPaymentMode: user.monthlyPaymentMode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/users',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUserStats() {
    const startTime = Date.now();

    try {
      const stats = await this.userService.getUserStats();
      const duration = Date.now() - startTime;

      this.logger.logApiRequest('GET', '/users/stats', HttpStatus.OK, duration);

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/users/stats',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }
}
