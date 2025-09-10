import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../common/interfaces/user.interface';
import { UserProfileDto } from '../common/dto/auth.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly users = new Map<string, User>();
  private readonly phoneIndex = new Map<string, string>(); // phone -> userId

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const userId = this.phoneIndex.get(phone);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user: User = {
      id: uuidv4(),
      phone: userData.phone!,
      name: userData.name,
      email: userData.email,
      addresses: userData.addresses || [],
      walletBalance: userData.walletBalance || 0,
      role: userData.role || UserRole.CUSTOMER,
      isActive: userData.isActive !== false,
      monthlyPaymentMode: userData.monthlyPaymentMode || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    this.phoneIndex.set(user.phone, user.id);
    
    this.logger.log(`Created new user: ${user.id} with phone: ${user.phone}`);
    return user;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = {
      ...user,
      ...updateData,
      id: user.id, // Ensure ID cannot be changed
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    this.logger.log(`Updated user: ${id}`);
    return updatedUser;
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      isActive: user.isActive,
      monthlyPaymentMode: user.monthlyPaymentMode,
      addresses: user.addresses.map(addr => ({
        id: addr.id,
        type: addr.type,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        landmark: addr.landmark,
        latitude: addr.latitude,
        longitude: addr.longitude,
        isDefault: addr.isDefault,
      })),
      createdAt: user.createdAt,
    };
  }

  async updateWalletBalance(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.walletBalance += amount;
    user.updatedAt = new Date();

    this.users.set(userId, user);
    this.logger.log(`Updated wallet balance for user ${userId}: ${user.walletBalance}`);
    return user;
  }

  async updateMonthlyPaymentMode(userId: string, monthlyPaymentMode: boolean): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.monthlyPaymentMode = monthlyPaymentMode;
    user.updatedAt = new Date();

    this.users.set(userId, user);
    this.logger.log(`Updated monthly payment mode for user ${userId}: ${monthlyPaymentMode}`);
    return user;
  }

  // For development - seed some test data
  async seedTestData(): Promise<void> {
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
  }
}
