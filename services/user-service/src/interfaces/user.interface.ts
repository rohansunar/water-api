export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  DELIVERY_AGENT = 'delivery_agent',
  ADMIN = 'admin',
}

export interface UserAddress {
  id?: string;
  type: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  walletBalance: number;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  addresses: UserAddress[];
  createdAt: Date;
}

export interface CreateUserRequest {
  phone: string;
  name: string;
  email?: string;
  role?: UserRole;
  addresses?: UserAddress[];
  walletBalance?: number;
  monthlyPaymentMode?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  monthlyPaymentMode?: boolean;
  isActive?: boolean;
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
