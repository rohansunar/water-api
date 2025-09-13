// Product Service API Contract
export interface ProductServiceContract {
  // Product Management
  createProduct(data: CreateProductRequest): Promise<ProductResponse>;
  getProductById(id: string): Promise<ProductResponse | null>;
  getProductsByVendor(vendorId: string): Promise<ProductResponse[]>;
  updateProduct(id: string, data: UpdateProductRequest): Promise<ProductResponse>;
  deleteProduct(id: string): Promise<void>;
  
  // Inventory Management
  updateStock(id: string, quantity: number, operation?: StockOperation): Promise<ProductResponse>;
  checkStock(id: string): Promise<number>;
  reserveStock(id: string, quantity: number): Promise<boolean>;
  releaseStock(id: string, quantity: number): Promise<boolean>;
  
  // Product Search & Discovery
  searchProducts(criteria: ProductSearchRequest): Promise<ProductSearchResponse>;
  getCategories(): Promise<string[]>;
  getFeaturedProducts(limit?: number): Promise<ProductResponse[]>;
  
  // Product Ratings
  updateRating(id: string, rating: number, reviewCount: number): Promise<ProductResponse>;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  unit: string;
  capacity: number;
  stockQuantity: number;
  vendorId: string;
  hasDeposit?: boolean;
  depositAmount?: number;
  images?: string[];
  orderLimits?: ProductOrderLimits;
  specifications?: ProductSpecifications;
  tags?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  unit?: string;
  capacity?: number;
  stockQuantity?: number;
  hasDeposit?: boolean;
  depositAmount?: number;
  images?: string[];
  isActive?: boolean;
  isAvailable?: boolean;
  orderLimits?: ProductOrderLimits;
  specifications?: ProductSpecifications;
  tags?: string[];
}

export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  unit: string;
  capacity: number;
  stockQuantity: number;
  vendorId: string;
  hasDeposit: boolean;
  depositAmount: number;
  images: string[];
  isActive: boolean;
  isAvailable: boolean;
  orderLimits: ProductOrderLimits;
  specifications?: ProductSpecifications;
  tags: string[];
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductOrderLimits {
  minQuantity: number;
  maxQuantity: number;
}

export interface ProductSpecifications {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

export interface ProductSearchRequest {
  search?: string;
  category?: string;
  vendorId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  hasDeposit?: boolean;
  sortBy?: 'name' | 'price' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductSearchResponse {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export enum StockOperation {
  ADD = 'add',
  SUBTRACT = 'subtract',
  SET = 'set',
}

// HTTP Client Implementation
export interface ProductServiceClient {
  baseUrl: string;
  
  // HTTP methods that implement the contract
  get(path: string, config?: any): Promise<any>;
  post(path: string, data?: any, config?: any): Promise<any>;
  put(path: string, data?: any, config?: any): Promise<any>;
  delete(path: string, config?: any): Promise<any>;
}
