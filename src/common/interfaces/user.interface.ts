export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  addresses: Address[];
  walletBalance: number;
  role: UserRole;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  userId: string;
  type: AddressType;
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

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  DELIVERY_AGENT = 'delivery_agent',
  ADMIN = 'admin',
}

export enum AddressType {
  HOME = 'home',
  OFFICE = 'office',
  OTHER = 'other',
}
