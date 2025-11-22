import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorProductService } from '../services/vendor-product.service';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  UpdateVendorProductMappingDto,
  VendorProductResponseDto,
  VendorProductMappingResponseDto,
  UploadProductImagesDto,
  UploadProductImagesResponseDto,
  DeleteProductImageDto,
  ReorderProductImagesDto,
  ProductImagesResponseDto,
} from '../dto/vendor.dto';
import { VendorJwtAuthGuard } from '../guards/vendor-jwt-auth.guard';
import { CurrentVendor } from '../decorators/current-vendor.decorator';
import { Vendor } from '../interfaces/vendor.interface';

@ApiTags('Vendor Products')
@Controller('vendors/me/products')
@UseGuards(VendorJwtAuthGuard)
export class VendorProductController {
  private readonly logger = new Logger(VendorProductController.name);

  constructor(private readonly vendorProductService: VendorProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Create a new product for the authenticated vendor',
  })
  @ApiBody({ type: CreateVendorProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: VendorProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Vendor not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Product with this name already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Product with this name already exists for this vendor',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async createProduct(
    @Body() createProductDto: CreateVendorProductDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<VendorProductResponseDto> {
    this.logger.log(
      `Product creation attempt for vendor: ${vendor.id}, product title: ${createProductDto.title}`,
    );
    return this.vendorProductService.createProduct(vendor, createProductDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Retrieve all products for the authenticated vendor with pagination and filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category',
    example: 'water_jar',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: { $ref: '#/components/schemas/VendorProductResponseDto' },
        },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Failed to retrieve products' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getProducts(
    @CurrentVendor() vendor: Vendor,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<{
    products: VendorProductResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    this.logger.log(
      `Products retrieval attempt for vendor: ${vendor.id}, page: ${pageNum}, limit: ${limitNum}`,
    );
    return this.vendorProductService.getProducts(
      vendor,
      pageNum,
      limitNum,
      category,
      isActive,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product by ID',
    description:
      'Retrieve a specific product by its ID for the authenticated vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: VendorProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid product ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Failed to retrieve product' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getProductById(
    @Param('id') productId: string,
    @CurrentVendor() vendor: Vendor,
  ): Promise<VendorProductResponseDto> {
    this.logger.log(
      `Product retrieval attempt for vendor: ${vendor.id}, product ID: ${productId}`,
    );
    return this.vendorProductService.getProductById(vendor, productId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update product',
    description: 'Update a specific product for the authenticated vendor',
  })
  @ApiBody({ type: UpdateVendorProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: VendorProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Product with this name already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Product with this name already exists for this vendor',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Product update failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async updateProduct(
    @Param('id') productId: string,
    @Body() updateProductDto: UpdateVendorProductDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<VendorProductResponseDto> {
    this.logger.log(
      `Product update attempt for vendor: ${vendor.id}, product ID: ${productId}`,
    );
    return this.vendorProductService.updateProduct(
      vendor,
      productId,
      updateProductDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product (soft delete)',
    description: 'Soft delete a specific product for the authenticated vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Product deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Product deletion failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Product deletion failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async deleteProduct(
    @Param('id') productId: string,
    @CurrentVendor() vendor: Vendor,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Product deletion attempt for vendor: ${vendor.id}, product ID: ${productId}`,
    );
    await this.vendorProductService.deleteProduct(vendor, productId);
    return { message: 'Product deleted successfully' };
  }

  @Put('/mapping/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update product mapping',
    description: 'Update a specific product mapping',
  })
  @ApiBody({ type: UpdateVendorProductMappingDto })
  @ApiResponse({
    status: 200,
    description: 'Product mapping updated successfully',
    type: VendorProductMappingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product mapping not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product mapping not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async updateProductMapping(
    @Param('id') mappingId: string,
    @Body() updateProductMappingDto: UpdateVendorProductMappingDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<VendorProductMappingResponseDto> {
    this.logger.log(
      `Product mapping update attempt for vendor: ${vendor.id}, mapping ID: ${mappingId}`,
    );
    return this.vendorProductService.updateProductMapping(
      vendor,
      mappingId,
      updateProductMappingDto,
    );
  }

  /**
   * Upload multiple images for a specific product.
   *
   * This endpoint allows vendors to upload up to 10 images per product.
   * Images are appended to existing images, with a maximum total of 10 images per product.
   *
   * Validation performed:
   * - File format: Only JPEG, JPG, and PNG formats are accepted
   * - File size: Maximum 5MB per image
   * - Image count: Maximum 10 images per product (including existing ones)
   *
   * Security considerations:
   * - Files are validated for malicious content through format checking
   * - Images are processed and sanitized before storage
   * - File names are sanitized to prevent path traversal attacks
   *
   * Processing steps:
   * 1. Validate product ownership and existence
   * 2. Check current image count against limits
   * 3. Validate each uploaded file (format, size)
   * 4. Process images (resize to 800x600, convert to WebP format)
   * 5. Upload processed images to S3 with unique keys
   * 6. Update product record with new image URLs
   *
   * Error handling:
   * - Invalid file formats or sizes return 400 Bad Request
   * - Product not found returns 404 Not Found
   * - S3 upload failures trigger rollback of any partially uploaded images
   * - Database update failures trigger cleanup of uploaded S3 files
   *
   * @param productId - The unique identifier of the product
   * @param files - Array of uploaded image files from multipart form data
   * @param vendor - The authenticated vendor making the request
   * @returns Promise<UploadProductImagesResponseDto> - Details of uploaded images
   */
  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload product images',
    description:
      'Upload multiple images for a product (max 10 images, appends to existing images)',
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: UploadProductImagesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, size, or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async uploadProductImages(
    @Param('id') productId: string,
    @Req() req: FastifyRequest,
    @CurrentVendor() vendor: Vendor,
  ): Promise<UploadProductImagesResponseDto> {
    const files: any[] = [];

    // Process multipart form data
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        // Collect file data
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        files.push({
          buffer,
          filename: part.filename,
          mimetype: part.mimetype,
          encoding: part.encoding,
          fields: part.fields,
        });
      }
    }

    this.logger.log(
      `Product images upload attempt for vendor: ${vendor.id}, product ID: ${productId}, files count: ${files.length}`,
    );

    return this.vendorProductService.uploadProductImages(
      vendor,
      productId,
      files,
    );
  }

  /**
   * Retrieve all images associated with a specific product.
   *
   * This endpoint returns a list of all images for a product, including metadata
   * such as image URLs, filenames, dimensions, and upload timestamps.
   *
   * Access control:
   * - Only the vendor who owns the product can access its images
   * - Product ownership is validated before returning image data
   *
   * Response includes:
   * - Product ID and total image count
   * - Maximum allowed images (currently 10)
   * - Array of image objects with URLs and metadata
   *
   * Security considerations:
   * - URLs point to S3 with public read access for authenticated requests
   * - No sensitive file system paths are exposed
   *
   * @param productId - The unique identifier of the product
   * @param vendor - The authenticated vendor making the request
   * @returns Promise<ProductImagesResponseDto> - List of product images with metadata
   */
  @Get(':id/images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product images',
    description: 'Retrieve all images for a specific product',
  })
  @ApiResponse({
    status: 200,
    description: 'Product images retrieved successfully',
    type: ProductImagesResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductImages(
    @Param('id') productId: string,
    @CurrentVendor() vendor: Vendor,
  ): Promise<ProductImagesResponseDto> {
    this.logger.log(
      `Product images retrieval attempt for vendor: ${vendor.id}, product ID: ${productId}`,
    );
    return this.vendorProductService.getProductImages(vendor, productId);
  }

  /**
   * Delete a specific image from a product.
   *
   * This endpoint removes a single image from a product's image collection.
   * The image is identified by its S3 key or URL identifier.
   *
   * Access control:
   * - Only the vendor who owns the product can delete its images
   * - Product ownership and image existence are validated before deletion
   *
   * Deletion process:
   * 1. Validate product ownership and existence
   * 2. Verify the image exists in the product's image array
   * 3. Remove the image URL from the product's images array
   * 4. Update the product record in the database
   * 5. Optional: Delete the file from S3 storage (marked as TODO for future implementation)
   *
   * Security considerations:
   * - Image IDs are validated to prevent unauthorized deletions
   * - Only images belonging to the vendor's products can be deleted
   * - Database transaction ensures consistency between product record and storage
   *
   * Error handling:
   * - Product not found returns 404 Not Found
   * - Image not found in product returns 404 Not Found
   * - Database update failures are logged and return 400 Bad Request
   *
   * @param productId - The unique identifier of the product
   * @param deleteImageDto - DTO containing the image ID to delete
   * @param vendor - The authenticated vendor making the request
   * @returns Promise<{message: string, remainingImages: number}> - Success message and count of remaining images
   */
  @Delete(':id/images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product image',
    description: 'Delete a specific image from a product',
  })
  @ApiBody({ type: DeleteProductImageDto })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Image deleted successfully' },
        remainingImages: { type: 'number', example: 4 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product or image not found',
  })
  async deleteProductImage(
    @Param('id') productId: string,
    @Body() deleteImageDto: DeleteProductImageDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<{ message: string; remainingImages: number }> {
    this.logger.log(
      `Product image deletion attempt for vendor: ${vendor.id}, product ID: ${productId}, image ID: ${deleteImageDto.imageId}`,
    );
    return this.vendorProductService.deleteProductImage(
      vendor,
      productId,
      deleteImageDto.imageId,
    );
  }

  /**
   * Reorder the images for a specific product.
   *
   * This endpoint allows vendors to change the display order of product images
   * by providing a new ordered list of image IDs. The order affects how images
   * are displayed in the product catalog and customer-facing interfaces.
   *
   * Access control:
   * - Only the vendor who owns the product can reorder its images
   * - Product ownership is validated before reordering
   *
   * Reordering process:
   * 1. Validate product ownership and existence
   * 2. Verify that all provided image IDs exist in the current image set
   * 3. Ensure the number of provided IDs matches the current image count
   * 4. Reorder the images array according to the provided order
   * 5. Update the product record with the reordered image URLs
   *
   * Validation requirements:
   * - All provided image IDs must exist in the product's current images
   * - The number of image IDs must match the total number of images
   * - Image IDs are validated to prevent invalid reordering attempts
   *
   * Security considerations:
   * - Only image IDs belonging to the vendor's product can be reordered
   * - Reordering is atomic - either all images are reordered or none are
   * - Database transaction ensures consistency during the update
   *
   * Error handling:
   * - Product not found returns 404 Not Found
   * - Mismatched image count returns 400 Bad Request
   * - Invalid image IDs return 400 Bad Request
   * - Database update failures are logged and return 400 Bad Request
   *
   * @param productId - The unique identifier of the product
   * @param reorderDto - DTO containing the new ordered list of image IDs
   * @param vendor - The authenticated vendor making the request
   * @returns Promise<{message: string, images: ProductImageResponseDto[]}> - Success message and reordered image list
   */
  @Put(':id/images/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder product images',
    description:
      'Reorder the images for a product by providing the new order of image IDs',
  })
  @ApiBody({ type: ReorderProductImagesDto })
  @ApiResponse({
    status: 200,
    description: 'Images reordered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Images reordered successfully' },
        images: {
          type: 'array',
          items: { $ref: '#/components/schemas/ProductImageResponseDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image IDs or order',
  })
  async reorderProductImages(
    @Param('id') productId: string,
    @Body() reorderDto: ReorderProductImagesDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<{ message: string; images: any[] }> {
    this.logger.log(
      `Product images reorder attempt for vendor: ${vendor.id}, product ID: ${productId}`,
    );
    return this.vendorProductService.reorderProductImages(
      vendor,
      productId,
      reorderDto.imageIds,
    );
  }
}
