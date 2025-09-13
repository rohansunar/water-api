import { 
  IsString, 
  IsNumber, 
  IsBoolean, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNotEmpty, 
  Min, 
  Max,
  IsEnum,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductSpecificationsDto {
  @IsNumber()
  @Min(0)
  weight: number;

  @ValidateNested()
  @Type(() => ProductDimensionsDto)
  dimensions: ProductDimensionsDto;
}

class ProductDimensionsDto {
  @IsNumber()
  @Min(0)
  length: number;

  @IsNumber()
  @Min(0)
  width: number;

  @IsNumber()
  @Min(0)
  height: number;
}

class ProductOrderLimitsDto {
  @IsNumber()
  @Min(1)
  minQuantity: number;

  @IsNumber()
  @Min(1)
  maxQuantity: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  capacity: number;

  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @IsBoolean()
  @IsOptional()
  hasDeposit?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  depositAmount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ValidateNested()
  @Type(() => ProductOrderLimitsDto)
  @IsOptional()
  orderLimits?: ProductOrderLimitsDto;

  @ValidateNested()
  @Type(() => ProductSpecificationsDto)
  @IsOptional()
  specifications?: ProductSpecificationsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  capacity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stockQuantity?: number;

  @IsBoolean()
  @IsOptional()
  hasDeposit?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  depositAmount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ValidateNested()
  @Type(() => ProductOrderLimitsDto)
  @IsOptional()
  orderLimits?: ProductOrderLimitsDto;

  @ValidateNested()
  @Type(() => ProductSpecificationsDto)
  @IsOptional()
  specifications?: ProductSpecificationsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateStockDto {
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsEnum(['add', 'subtract', 'set'])
  @IsOptional()
  operation?: 'add' | 'subtract' | 'set';
}

export class ProductSearchDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxPrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  hasDeposit?: boolean;

  @IsEnum(['name', 'price', 'rating', 'createdAt'])
  @IsOptional()
  sortBy?: 'name' | 'price' | 'rating' | 'createdAt';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ProductResponseDto {
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
  orderLimits: {
    minQuantity: number;
    maxQuantity: number;
  };
  specifications?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
  tags: string[];
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
