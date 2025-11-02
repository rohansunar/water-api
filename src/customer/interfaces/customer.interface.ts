export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  addresses: Address[];
  walletBalance: number;
  role: CustomerRole;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  customerId: string;
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

export enum CustomerRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  DELIVERY_RIDER = 'delivery_rider',
  ADMIN = 'admin',
}

export enum AddressType {
  HOME = 'home',
  OFFICE = 'office',
  OTHER = 'other',
}