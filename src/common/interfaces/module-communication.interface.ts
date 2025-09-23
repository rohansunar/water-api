/**
 * Module Communication Interfaces
 * Defines contracts for inter-module communication in modular monolithic architecture
 */

// Base interface for all module services
export interface IModuleService {
  readonly moduleName: string;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;
}

// User module interfaces
export interface IUserService extends IModuleService {
  findById(id: string): Promise<UserData | null>;
  findByEmail(email: string): Promise<UserData | null>;
  findByPhone(phone: string): Promise<UserData | null>;
  validateUser(id: string): Promise<boolean>;
  createUser(userData: CreateUserData): Promise<UserData>;
  updateUser(id: string, updateData: Partial<UserData>): Promise<UserData>;
  deleteUser(id: string): Promise<void>;
}

export interface UserData {
  id: string;
  email: string;
  phone: string;
  role: 'customer' | 'vendor' | 'agent' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  phone: string;
  role: 'customer' | 'vendor' | 'agent' | 'admin';
  password?: string;
}

// Product module interfaces
export interface IProductService extends IModuleService {
  findById(id: string): Promise<ProductData | null>;
  findByVendor(vendorId: string): Promise<ProductData[]>;
  findByLocation(location: string): Promise<ProductData[]>;
  validateProduct(id: string): Promise<boolean>;
  updateStock(id: string, quantity: number): Promise<ProductData>;
  checkAvailability(id: string, quantity: number): Promise<boolean>;
}

export interface ProductData {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Vendor module interfaces
export interface IVendorService extends IModuleService {
  findById(id: string): Promise<VendorData | null>;
  findByUserId(userId: string): Promise<VendorData | null>;
  validateVendor(id: string): Promise<boolean>;
  isVendorActive(id: string): Promise<boolean>;
  getVendorsByLocation(location: string): Promise<VendorData[]>;
}

export interface VendorData {
  id: string;
  userId: string;
  businessName: string;
  businessAddress: string;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  isActive: boolean;
  rating: number;
  totalOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

// Order module interfaces
export interface IOrderService extends IModuleService {
  findById(id: string): Promise<OrderData | null>;
  findByUser(userId: string): Promise<OrderData[]>;
  findByVendor(vendorId: string): Promise<OrderData[]>;
  createOrder(orderData: CreateOrderData): Promise<OrderData>;
  updateOrderStatus(id: string, status: string): Promise<OrderData>;
  cancelOrder(id: string, reason: string): Promise<OrderData>;
}

export interface OrderData {
  id: string;
  userId: string;
  vendorId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderData {
  userId: string;
  productId: string;
  quantity: number;
  deliveryAddress: string;
  paymentMethod: string;
  specialInstructions?: string;
}

// Ledger module interfaces
export interface ILedgerService extends IModuleService {
  createLedgerEntry(entryData: CreateLedgerEntryData): Promise<LedgerEntryData>;
  getVendorLedger(
    vendorId: string,
    filters?: LedgerFilters,
  ): Promise<LedgerEntryData[]>;
  getVendorBalance(vendorId: string): Promise<number>;
  createPayout(payoutData: CreatePayoutData): Promise<PayoutData>;
  getVendorAnalytics(
    vendorId: string,
    period?: string,
  ): Promise<VendorAnalyticsData>;
}

export interface LedgerEntryData {
  id: string;
  vendorId: string;
  type: string;
  amount: number;
  description: string;
  referenceId: string;
  referenceType: string;
  status: string;
  createdAt: Date;
}

export interface CreateLedgerEntryData {
  vendorId: string;
  type: string;
  amount: number;
  description: string;
  referenceId: string;
  referenceType: string;
}

export interface LedgerFilters {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PayoutData {
  id: string;
  vendorId: string;
  amount: number;
  method: string;
  status: string;
  createdAt: Date;
}

export interface CreatePayoutData {
  vendorId: string;
  amount: number;
  method: string;
}

export interface VendorAnalyticsData {
  vendorId: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  pendingAmount: number;
  paidAmount: number;
  period: string;
}

// Wallet module interfaces
export interface IWalletService extends IModuleService {
  getWallet(userId: string): Promise<WalletData>;
  topupWallet(userId: string, amount: number): Promise<WalletTransactionData>;
  debitWallet(
    userId: string,
    amount: number,
    reference: string,
  ): Promise<WalletTransactionData>;
  getBalance(userId: string): Promise<number>;
  validateBalance(userId: string, amount: number): Promise<boolean>;
}

export interface WalletData {
  id: string;
  userId: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionData {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  balance: number;
  reference: string;
  status: string;
  createdAt: Date;
}

// Rider module interfaces
export interface IRiderService extends IModuleService {
  findById(id: string): Promise<RiderData | null>;
  findByUserId(userId: string): Promise<RiderData | null>;
  findAvailableRiders(location: string): Promise<RiderData[]>;
  assignOrder(riderId: string, orderId: string): Promise<void>;
  updateLocation(
    riderId: string,
    location: { lat: number; lng: number },
  ): Promise<void>;
}

export interface RiderData {
  id: string;
  userId: string;
  isAvailable: boolean;
  currentLocation: { lat: number; lng: number };
  rating: number;
  totalDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

// Auth module interfaces
export interface IAuthService extends IModuleService {
  validateToken(token: string): Promise<TokenValidationResult>;
  generateToken(userId: string, role: string): Promise<string>;
  refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  revokeToken(token: string): Promise<void>;
}

export interface TokenValidationResult {
  isValid: boolean;
  userId?: string;
  role?: string;
  expiresAt?: Date;
}

// Common response interfaces
export interface ModuleResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId?: string;
    correlationId?: string;
  };
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Module health check interface
export interface ModuleHealthStatus {
  module: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  lastCheck: Date;
  dependencies: {
    database: 'connected' | 'disconnected';
    externalServices: 'available' | 'unavailable';
  };
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    requestCount: number;
    errorRate: number;
  };
}
