import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ProductCategory,
  ProductSize,
} from '../../product/interfaces/product.interface';

export class CreateProductDto {
  @ApiProperty({
    description: 'Store ID where the product is available',
    example: '123',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'Product title/name',
    example: 'Premium Mineral Water 20L',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'PW-20L-001',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Premium quality mineral water in 20L container',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'water_jar',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Product attributes in JSON format',
    example: { size: '20L', type: 'mineral', brand: 'AquaPure' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Base price of the product',
    example: 50.0,
  })
  @IsNotEmpty()
  base_price: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'liter',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class UpdateProductDto {
  @ApiProperty({
    description: 'Product title/name',
    example: 'Premium Mineral Water 20L',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'PW-20L-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Premium quality mineral water in 20L container',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'water_jar',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Product attributes in JSON format',
    example: { size: '20L', type: 'mineral', brand: 'AquaPure' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Base price of the product',
    example: 50.0,
    required: false,
  })
  @IsOptional()
  base_price?: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'liter',
    required: false,
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({
    description: 'Product active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateProductMappingDto {
  @ApiProperty({
    description: 'Price for this store',
    example: 50.0,
    required: false,
  })
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Stock quantity available at this store',
    example: 100,
    required: false,
  })
  @IsOptional()
  stock?: number;

  @ApiProperty({
    description: 'Area pincodes where this mapping is applicable',
    example: ['110001', '110002', '110003'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  area_pincodes?: string[];

  @ApiProperty({
    description: 'Mapping active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor unique identifier',
    example: '456',
  })
  vendor_id: string;

  @ApiProperty({
    description: 'Product title/name',
    example: 'Premium Mineral Water 20L',
  })
  title: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'PW-20L-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Premium quality mineral water in 20L container',
  })
  description?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'water_jar',
  })
  category: string;

  @ApiProperty({
    description: 'Product attributes',
    example: { size: '20L', type: 'mineral', brand: 'AquaPure' },
  })
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Base price of the product',
    example: 50.0,
  })
  base_price: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'liter',
  })
  unit: string;

  @ApiProperty({
    description: 'Product active status',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Product creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Product last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}

export class ProductMappingResponseDto {
  @ApiProperty({
    description: 'Product mapping unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Product unique identifier',
    example: '456',
  })
  product_id: string;

  @ApiProperty({
    description: 'Store unique identifier',
    example: '789',
  })
  store_id: string;

  @ApiProperty({
    description: 'Product variant unique identifier',
    example: '101',
  })
  product_variant_id: string;

  @ApiProperty({
    description: 'Price for this store',
    example: 50.0,
  })
  price?: number;

  @ApiProperty({
    description: 'Stock quantity available at this store',
    example: 100,
  })
  stock: number;

  @ApiProperty({
    description: 'Reserved stock quantity',
    example: 10,
  })
  reserved_stock: number;

  @ApiProperty({
    description: 'Area pincodes where this mapping is applicable',
    example: ['110001', '110002', '110003'],
  })
  area_pincodes: string[];

  @ApiProperty({
    description: 'Mapping active status',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Mapping creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Mapping last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}

export class UploadProductImagesDto {
  @ApiProperty({
    description: 'Product images to upload',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    maxItems: 10,
  })
  images: any[];
}

export class ProductImageResponseDto {
  @ApiProperty({
    description: 'Image unique identifier',
    example: 'products/123/1703123456789_image.jpg',
  })
  id: string;

  @ApiProperty({
    description: 'Image URL',
    example:
      'https://water-delivery-images.s3.amazonaws.com/products/123/1703123456789_image.webp',
  })
  url: string;

  @ApiProperty({
    description: 'Image filename',
    example: 'product-image-1.webp',
  })
  filename: string;

  @ApiProperty({
    description: 'Image size in bytes',
    example: 245760,
  })
  size: number;

  @ApiProperty({
    description: 'Image width in pixels',
    example: 800,
  })
  width: number;

  @ApiProperty({
    description: 'Image height in pixels',
    example: 600,
  })
  height: number;

  @ApiProperty({
    description: 'Image upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: Date;
}

export class UploadProductImagesResponseDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  productId: string;

  @ApiProperty({
    description: 'Total number of images uploaded',
    example: 3,
  })
  uploadedCount: number;

  @ApiProperty({
    description: 'List of uploaded images',
    type: [ProductImageResponseDto],
  })
  images: ProductImageResponseDto[];

  @ApiProperty({
    description: 'Total number of images for this product after upload',
    example: 5,
  })
  totalImages: number;

  @ApiProperty({
    description: 'Upload completion timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: Date;
}

export class DeleteProductImageDto {
  @ApiProperty({
    description: 'Image ID to delete',
    example: 'products/123/1703123456789_image.webp',
  })
  @IsString()
  @IsNotEmpty()
  imageId: string;
}

export class ReorderProductImagesDto {
  @ApiProperty({
    description: 'Ordered list of image IDs',
    example: [
      'products/123/1703123456789_image1.webp',
      'products/123/1703123456789_image2.webp',
      'products/123/1703123456789_image3.webp',
    ],
    type: [String],
    maxItems: 10,
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  imageIds: string[];
}
