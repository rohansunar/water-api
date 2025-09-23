// User Service API Contract
export interface UserServiceContract {
  // User Management
  createUser(data: CreateUserRequest): Promise<UserResponse>;
  getUserById(id: string): Promise<UserResponse | null>;
  getUserByPhone(phone: string): Promise<UserResponse | null>;
  updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse>;
  getUserProfile(id: string): Promise<UserProfileResponse>;
  
  // Wallet Management
  updateWalletBalance(id: string, amount: number): Promise<WalletUpdateResponse>;
  getWalletBalance(id: string): Promise<number>;
  
  // Address Management
  createAddress(userId: string, data: CreateAddressRequest): Promise<AddressResponse>;
  getUserAddresses(userId: string): Promise<AddressResponse[]>;
  updateAddress(addressId: string, data: UpdateAddressRequest): Promise<AddressResponse>;
  deleteAddress(addressId: string): Promise<void>;
  
  // Authentication & Authorization
  validateUser(id: string): Promise<boolean>;
  getUserRole(id: string): Promise<UserRole>;
}

export interface CreateUserRequest {
  phone: string;
  name: string;
  email?: string;
  role?: UserRole;
  walletBalance?: number;
  monthlyPaymentMode?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  monthlyPaymentMode?: boolean;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  walletBalance: number;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileResponse extends UserResponse {
  addresses: AddressResponse[];
}

export interface CreateAddressRequest {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface AddressResponse {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletUpdateResponse {
  id: string;
  walletBalance: number;
  updatedAt: Date;
}

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  DELIVERY_RIDER = 'delivery_rider',
  ADMIN = 'admin',
}

// HTTP Client Implementation
export interface UserServiceClient {
  baseUrl: string;
  
  // HTTP methods that implement the contract
  get(path: string, config?: any): Promise<any>;
  post(path: string, data?: any, config?: any): Promise<any>;
  put(path: string, data?: any, config?: any): Promise<any>;
  delete(path: string, config?: any): Promise<any>;
}
