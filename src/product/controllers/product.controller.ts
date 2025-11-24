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
  ParseFloatPipe,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { AdminVendorGuard } from '../../auth/guards/admin-vendor.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { User } from '../../common/interfaces/user.interface';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateProductMappingDto,
  ProductResponseDto,
  ProductMappingResponseDto,
  UploadProductImagesDto,
  UploadProductImagesResponseDto,
  DeleteProductImageDto,
  ReorderProductImagesDto,
  ProductImageResponseDto,
} from '../dto/product.dto';

@ApiTags('Products')
@Controller('products')
@UseGuards(AdminVendorGuard)
@ApiBearerAuth()
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Search products',
    description: 'Search for available products with optional filters for query, category, and location. Supports pagination.',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    type: String,
    description: 'Search query to match product name or description',
    example: 'water jar',
  })
  @ApiQuery({
    name: 'pincode',
    required: false,
    type: String,
    description: 'Filter by delivery pincode (not yet implemented)',
    example: '110001',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by product category',
    example: 'water_jar',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results per page (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '123' },
              name: { type: 'string', example: 'Premium Water Jar' },
              category: { type: 'string', example: 'water_jar' },
              subcategory: { type: 'string', example: '20L' },
              price: { type: 'number', example: 1500.00 },
              store: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '456' },
                  name: { type: 'string', example: 'ABC Store' },
                  rating: { type: 'number', example: 4.5 },
                  distance_km: { type: 'number', example: 2.3 },
                },
              },
              is_available: { type: 'boolean', example: true },
              stock_quantity: { type: 'number', example: 50 },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 20 },
                total: { type: 'number', example: 150 },
                total_pages: { type: 'number', example: 8 },
                has_next: { type: 'boolean', example: true },
                has_prev: { type: 'boolean', example: false },
              },
            },
          },
        },
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
        message: { type: 'string', example: 'Invalid query parameters' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async searchProducts(@Query() searchDto: any): Promise<any> {
    this.logger.log(
      `Searching products with query: ${JSON.stringify(searchDto)}`,
    );
    return this.productService.searchProducts(searchDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Create a new product for the authenticated vendor or admin',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
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
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProductResponseDto> {
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product creation attempt for user: ${currentUser.id}, product title: ${createProductDto.title}`,
    );
    return this.productService.createProduct(user, createProductDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Retrieve all products with pagination and filtering based on user role',
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
          items: { $ref: '#/components/schemas/ProductResponseDto' },
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
    @CurrentUser() currentUser: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<{
    products: ProductResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };

    this.logger.log(
      `Products retrieval attempt for user: ${currentUser.id}, page: ${pageNum}, limit: ${limitNum}`,
    );
    return this.productService.getProducts(
      user,
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
    description: 'Retrieve a specific product by its ID based on user role',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
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
    @CurrentUser() currentUser: User,
  ): Promise<ProductResponseDto> {
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product retrieval attempt for user: ${currentUser.id}, product ID: ${productId}`,
    );
    return this.productService.getProductById(user, productId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update product',
    description: 'Update a specific product based on user role',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductResponseDto,
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
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProductResponseDto> {
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product update attempt for user: ${currentUser.id}, product ID: ${productId}`,
    );
    return this.productService.updateProduct(user, productId, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product (soft delete)',
    description: 'Soft delete a specific product based on user role',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
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
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product deletion attempt for user: ${currentUser.id}, product ID: ${productId}`,
    );
    await this.productService.deleteProduct(user, productId);
    return { message: 'Product deleted successfully' };
  }

  @Put('mapping/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update product mapping',
    description: 'Update a specific product mapping',
  })
  @ApiParam({ name: 'id', description: 'Mapping ID', type: String })
  @ApiBody({ type: UpdateProductMappingDto })
  @ApiResponse({
    status: 200,
    description: 'Product mapping updated successfully',
    type: ProductMappingResponseDto,
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
    @Body() updateProductMappingDto: UpdateProductMappingDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProductMappingResponseDto> {
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product mapping update attempt for user: ${currentUser.id}, mapping ID: ${mappingId}`,
    );
    return this.productService.updateProductMapping(
      user,
      mappingId,
      updateProductMappingDto,
    );
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload product images',
    description:
      'Upload multiple images for a product (max 10 images, appends to existing images)',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: UploadProductImagesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, size, or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid image file: File size too large' },
        error: { type: 'string', example: 'Bad Request' },
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
  async uploadProductImages(
    @Param('id') productId: string,
    @Req() req: FastifyRequest,
    @CurrentUser() currentUser: User,
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

    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product images upload attempt for user: ${currentUser.id}, product ID: ${productId}, files count: ${files.length}`,
    );

    return this.productService.uploadProductImages(user, productId, files);
  }

  @Delete(':id/images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product image',
    description: 'Delete a specific image from a product',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
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
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async deleteProductImage(
    @Param('id') productId: string,
    @Body() deleteImageDto: DeleteProductImageDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string; remainingImages: number }> {
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product image deletion attempt for user: ${currentUser.id}, product ID: ${productId}, image ID: ${deleteImageDto.imageId}`,
    );
    return this.productService.deleteProductImage(
      user,
      productId,
      deleteImageDto.imageId,
    );
  }

  @Put(':id/images/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder product images',
    description:
      'Reorder the images for a product by providing the new order of image IDs',
  })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
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
    description: 'Invalid image IDs or order',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid image ID format: image_abc' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async reorderProductImages(
    @Param('id') productId: string,
    @Body() reorderDto: ReorderProductImagesDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string; images: ProductImageResponseDto[] }> {
    const vendorId = currentUser.role === 'vendor' ? currentUser.id : undefined;
    const user = { id: currentUser.id, role: currentUser.role, vendorId };
    this.logger.log(
      `Product images reorder attempt for user: ${currentUser.id}, product ID: ${productId}`,
    );
    return this.productService.reorderProductImages(
      user,
      productId,
      reorderDto.imageIds,
    );
  }
}
