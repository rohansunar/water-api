import {
  IUserService,
  UserData,
  CreateUserData,
} from '../../../common/interfaces/module-communication.interface';
import { UserDocument, UserAddressDocument } from '../entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateAddressDto,
  UpdateAddressDto,
  UserProfileDto,
} from '../dto/user.dto';

/**
 * Extended User Service Interface
 * Extends the base IUserService with module-specific methods
 */
export interface IUserModuleService extends IUserService {
  // User management
  create(userData: CreateUserDto): Promise<UserDocument>;
  update(id: string, updateData: UpdateUserDto): Promise<UserDocument>;
  delete(id: string): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfileDto>;
  updateWalletBalance(
    userId: string,
    amount: number,
    description?: string,
  ): Promise<UserDocument>;
  updateMonthlyPaymentMode(
    userId: string,
    monthlyPaymentMode: boolean,
  ): Promise<UserDocument>;

  // Address management
  createAddress(
    userId: string,
    addressData: CreateAddressDto,
  ): Promise<UserAddressDocument>;
  getUserAddresses(userId: string): Promise<UserAddressDocument[]>;
  updateAddress(
    addressId: string,
    updateData: UpdateAddressDto,
  ): Promise<UserAddressDocument>;
  deleteAddress(addressId: string): Promise<void>;
  setDefaultAddress(userId: string, addressId: string): Promise<void>;

  // Query methods
  findByEmailDocument(email: string): Promise<UserDocument | null>;
  findByPhoneDocument(phone: string): Promise<UserDocument | null>;
  findByRole(role: string): Promise<UserDocument[]>;
  findActiveUsers(): Promise<UserDocument[]>;
  searchUsers(query: string, limit?: number): Promise<UserDocument[]>;

  // Validation methods
  validateUserExists(id: string): Promise<boolean>;
  validateUserActive(id: string): Promise<boolean>;
  validateUserRole(id: string, role: string): Promise<boolean>;

  // Statistics
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
    recentSignups: number;
  }>;

  // Development/Testing
  seedTestData(): Promise<void>;
  clearTestData(): Promise<void>;
}

// Event data interfaces for user module
export interface UserCreatedEventData {
  userId: string;
  phone: string;
  email?: string;
  role: string;
  name?: string;
}

export interface UserUpdatedEventData {
  userId: string;
  changes: Record<string, any>;
  previousValues: Record<string, any>;
}

export interface UserDeletedEventData {
  userId: string;
  phone: string;
  role: string;
  deletedAt: Date;
}

export interface WalletBalanceUpdatedEventData {
  userId: string;
  previousBalance: number;
  newBalance: number;
  amount: number;
  description?: string;
}

export interface AddressCreatedEventData {
  userId: string;
  addressId: string;
  isDefault: boolean;
}

export interface AddressUpdatedEventData {
  userId: string;
  addressId: string;
  changes: Record<string, any>;
}

export interface AddressDeletedEventData {
  userId: string;
  addressId: string;
  wasDefault: boolean;
}
