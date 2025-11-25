import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchProductsQueryDto {
  @ApiPropertyOptional({
    description: 'Search query string for product name or description',
    example: 'water bottle',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Product category filter',
    example: 'beverages',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Pincode for location-based filtering',
    example: '110001',
  })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ProductStoreDto {
  @ApiPropertyOptional({
    description: 'Store ID',
    example: '123',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Store name',
    example: 'Water Store Delhi',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Store rating',
    example: 4.5,
  })
  rating: number;

  @ApiPropertyOptional({
    description: 'Distance from user location in kilometers',
    example: 2.3,
  })
  distance_km: number;
}

export class ProductSearchResultDto {
  @ApiPropertyOptional({
    description: 'Product ID',
    example: '456',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Premium Water Bottle',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'beverages',
  })
  category: string;

  @ApiPropertyOptional({
    description: 'Product subcategory',
    example: '1L',
  })
  subcategory: string;

  @ApiPropertyOptional({
    description: 'Product price',
    example: 25.99,
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Store information',
    type: ProductStoreDto,
  })
  store: ProductStoreDto;

  @ApiPropertyOptional({
    description: 'Product availability status',
    example: true,
  })
  is_available: boolean;

  @ApiPropertyOptional({
    description: 'Available stock quantity',
    example: 150,
  })
  stock_quantity: number;
}

export class PaginationMetaDto {
  @ApiPropertyOptional({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiPropertyOptional({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiPropertyOptional({
    description: 'Total number of pages',
    example: 8,
  })
  total_pages: number;

  @ApiPropertyOptional({
    description: 'Whether there is a next page',
    example: true,
  })
  has_next: boolean;

  @ApiPropertyOptional({
    description: 'Whether there is a previous page',
    example: false,
  })
  has_prev: boolean;
}

export class SearchProductsMetaDto {
  @ApiPropertyOptional({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  pagination: PaginationMetaDto;
}

export class SearchProductsResponseDto {
  @ApiPropertyOptional({
    description: 'Array of product search results',
    type: [ProductSearchResultDto],
  })
  products: ProductSearchResultDto[];

  @ApiPropertyOptional({
    description: 'Response metadata including pagination',
    type: SearchProductsMetaDto,
  })
  meta: SearchProductsMetaDto;
}
