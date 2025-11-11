import { Address } from '../../customer/interfaces/customer.interface';

export interface User {
  id: string;
  _id?: string;
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

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  DELIVERY_RIDER = 'delivery_rider',
  ADMIN = 'admin',
}
