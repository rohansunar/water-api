export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  businessAddress: string;
  businessPhone?: string;
  businessEmail?: string;
  gstNumber?: string;
  licenseNumber?: string;
  documents?: {
    kycDoc?: string;
    businessLicense?: string;
    gstCertificate?: string;
    addressProof?: string;
  };
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  rejectionReason?: string;
  bankAccounts: BankAccount[];
  deliveryZones: DeliveryZone[];
  isActive: boolean;
  rating: number;
  totalOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  id: string;
  vendorId: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
  upiId?: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryZone {
  id: string;
  vendorId: string;
  name: string;
  coordinates: GeoCoordinate[];
  deliveryFee: number;
  minOrderAmount: number;
  maxDeliveryTime: number; // in minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface DeliverySlot {
  id: string;
  vendorId: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  maxOrders: number;
  isActive: boolean;
  daysOfWeek: DayOfWeek[];
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}
