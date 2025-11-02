import { CustomerRole } from '../../src/customer/interfaces/customer.interface';

export interface ICustomerServiceContract {
  // Customer Management
  createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse>;
  getCustomerById(id: string): Promise<CustomerResponse | null>;
  getCustomerByPhone(phone: string): Promise<CustomerResponse | null>;
  updateCustomer(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse>;
  deleteCustomer(id: string): Promise<void>;
  getCustomerProfile(id: string): Promise<CustomerProfileResponse>;
  
  // Address Management
  createAddress(customerId: string, data: CreateAddressRequest): Promise<AddressResponse>;
  getCustomerAddresses(customerId: string): Promise<AddressResponse[]>;
  updateAddress(addressId: string, data: UpdateAddressRequest): Promise<AddressResponse>;
  deleteAddress(addressId: string): Promise<void>;
  
  // Authentication & Authorization
  validateCustomer(id: string): Promise<boolean>;
  getCustomerRole(id: string): Promise<CustomerRole>;
  
  // Wallet Management
  updateWalletBalance(customerId: string, amount: number, operation?: 'add' | 'subtract' | 'set'): Promise<CustomerResponse>;
  
  // Query Methods
  findCustomersByRole(role: CustomerRole): Promise<CustomerResponse[]>;
  findActiveCustomers(): Promise<CustomerResponse[]>;
  searchCustomers(query: string, limit?: number): Promise<CustomerResponse[]>;
  
  // Statistics
  getCustomerStats(): Promise<CustomerStatsResponse>;
  
  // Development/Testing
  seedTestData(): Promise<void>;
  clearTestData(): Promise<void>;
}

export interface CreateCustomerRequest {
  phone: string;
  name: string;
  email?: string;
  role?: CustomerRole;
  walletBalance?: number;
  monthlyPaymentMode?: boolean;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  monthlyPaymentMode?: boolean;
  isActive?: boolean;
}

export interface CustomerResponse {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: CustomerRole;
  walletBalance: number;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerProfileResponse extends CustomerResponse {
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
  customerId: string;
  type: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerStatsResponse {
  totalCustomers: number;
  activeCustomers: number;
  customersByRole: Record<string, number>;
  recentSignups: number;
}

// Legacy interfaces for backward compatibility during migration
export interface IUserServiceContract extends ICustomerServiceContract {}
export interface CreateUserRequest extends CreateCustomerRequest {}
export interface UpdateUserRequest extends UpdateCustomerRequest {}
export interface UserResponse extends CustomerResponse {}
export interface UserProfileResponse extends CustomerProfileResponse {}
export interface UserStatsResponse extends CustomerStatsResponse {}
