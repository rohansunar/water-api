import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import {
  ProductCategory,
  ProductSize,
} from '../../product/interfaces/product.interface';

export class ProductResponseDto {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  category: string;
  size: string;
  price: number;
  depositAmount: number;
  hasDeposit: boolean;
  stockQuantity: number;
  isActive: boolean;
  images: string[];
  specifications: ProductSpecificationDto;
  vendor: VendorInfoDto;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductSpecificationDto {
  capacity: number;
  material: string;
  brand?: string;
  weight?: number;
  dimensions?: {
    height: number;
    diameter: number;
  };
}

export class VendorInfoDto {
  id: string;
  businessName: string;
  rating: number;
  totalOrders: number;
  deliveryZones: DeliveryZoneDto[];
}

export class DeliveryZoneDto {
  id: string;
  name: string;
  deliveryFee: number;
  minOrderAmount: number;
  maxDeliveryTime: number;
  isActive: boolean;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsEnum(ProductSize)
  size: ProductSize;

  @IsNumber()
  price: number;

  @IsNumber()
  depositAmount: number;

  @IsBoolean()
  hasDeposit: boolean;

  @IsNumber()
  stockQuantity: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class ProductSearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

export class ProductSearchResponseDto {
  products: ProductSearchResultDto[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
      cursor?: string;
    };
  };
}

export class ProductSearchResultDto {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  store: StoreInfoDto;
  is_available: boolean;
  stock_quantity: number;
}

export class StoreInfoDto {
  id: string;
  name: string;
  rating: number;
  distance_km: number;
}
