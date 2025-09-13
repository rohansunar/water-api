export interface ProductSpecifications {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

export interface ProductOrderLimits {
  minQuantity: number;
  maxQuantity: number;
}

export interface ProductFilter {
  category?: string;
  vendorId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  hasDeposit?: boolean;
  search?: string;
}

export interface ProductSort {
  field: 'name' | 'price' | 'rating' | 'createdAt';
  order: 'asc' | 'desc';
}

export interface ProductPagination {
  page: number;
  limit: number;
}

export interface ProductSearchResult {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export interface StockUpdateRequest {
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
}
