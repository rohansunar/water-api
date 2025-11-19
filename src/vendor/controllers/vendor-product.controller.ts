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
} from '@nestjs/common';
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
  CreateVendorProductVariantDto,
  UpdateVendorProductVariantDto,
  CreateVendorProductMappingDto,
  UpdateVendorProductMappingDto,
  VendorProductResponseDto,
  VendorProductVariantResponseDto,
  VendorProductMappingResponseDto,
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
    const { id } = vendor;
    this.logger.log(
      `Product creation attempt for vendor: ${id}, product title: ${createProductDto.title}`,
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
  ): Promise<{
    products: VendorProductResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { id, isActive } = vendor;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isActiveBool = isActive !== undefined ? isActive === true : undefined;

    this.logger.log(
      `Products retrieval attempt for vendor: ${id}, page: ${pageNum}, limit: ${limitNum}`,
    );
    return this.vendorProductService.getProducts(
      vendor,
      pageNum,
      limitNum,
      isActiveBool,
      category,
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
    const { id } = vendor;
    this.logger.log(
      `Product retrieval attempt for vendor: ${id}, product ID: ${productId}`,
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
    const { id } = vendor;
    this.logger.log(
      `Product update attempt for vendor: ${id}, product ID: ${productId}`,
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
    const { id } = vendor;
    this.logger.log(
      `Product deletion attempt for vendor: ${id}, product ID: ${productId}`,
    );
    await this.vendorProductService.deleteProduct(vendor, productId);
    return { message: 'Product deleted successfully' };
  }

  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create product variant',
    description: 'Create a variant for a specific product',
  })
  @ApiBody({ type: CreateVendorProductVariantDto })
  @ApiResponse({
    status: 201,
    description: 'Product variant created successfully',
    type: VendorProductVariantResponseDto,
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
    description: 'Product variant already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Product variant already exists' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async createProductVariant(
    @Param('id') productId: string,
    @Body() createProductVariantDto: CreateVendorProductVariantDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<VendorProductVariantResponseDto> {
    const { id } = vendor;

    this.logger.log(
      `Product variant creation attempt for vendor: ${id}, product ID: ${productId}`,
    );

    return this.vendorProductService.createProductVariant(
      vendor,
      productId,
      createProductVariantDto,
    );
  }

  @Put('/variants/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update product variant',
    description: 'Update a specific product variant',
  })
  @ApiBody({ type: UpdateVendorProductVariantDto })
  @ApiResponse({
    status: 200,
    description: 'Product variant updated successfully',
    type: VendorProductVariantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product variant not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product variant not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async updateProductVariant(
    @Param('id') variantId: string,
    @Body() updateProductVariantDto: UpdateVendorProductVariantDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<VendorProductVariantResponseDto> {
    const { id } = vendor;
    this.logger.log(
      `Product variant update attempt for vendor: ${id}, variant ID: ${variantId}`,
    );
    return this.vendorProductService.updateProductVariant(
      vendor,
      variantId,
      updateProductVariantDto,
    );
  }

  @Delete('/variants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete product variant',
    description: 'Delete a specific product variant',
  })
  @ApiResponse({
    status: 204,
    description: 'Product variant deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product variant not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product variant not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async deleteProductVariant(
    @Param('id') variantId: string,
    @CurrentVendor() vendor: Vendor,
  ): Promise<void> {
    const { id } = vendor;
    this.logger.log(
      `Product variant deletion attempt for vendor: ${id}, variant ID: ${variantId}`,
    );
    await this.vendorProductService.deleteProductVariant(vendor, variantId);
  }

  @Post('/mapping')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create product mapping',
    description: 'Create a mapping for a product to a specific store',
  })
  @ApiBody({ type: CreateVendorProductMappingDto })
  @ApiResponse({
    status: 201,
    description: 'Product mapping created successfully',
    type: VendorProductMappingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Store or product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Store not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Product mapping already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Product mapping already exists for this store',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async createProductMapping(
    @Body() createProductMappingDto: CreateVendorProductMappingDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<VendorProductMappingResponseDto> {
    const { id } = vendor;
    this.logger.log(`Product mapping creation attempt for vendor: ${id}`);
    return this.vendorProductService.createProductMapping(
      vendor,
      createProductMappingDto,
    );
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
    const { id } = vendor;
    this.logger.log(
      `Product mapping update attempt for vendor: ${id}, mapping ID: ${mappingId}`,
    );
    return this.vendorProductService.updateProductMapping(
      vendor,
      mappingId,
      updateProductMappingDto,
    );
  }

  @Get('/mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product mappings',
    description: 'Retrieve all product mappings for the authenticated vendor',
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
  @ApiResponse({
    status: 200,
    description: 'Product mappings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        mappings: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/VendorProductMappingResponseDto',
          },
        },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  async getProductMappings(
    @CurrentVendor() vendor: Vendor,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    mappings: VendorProductMappingResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { id } = vendor;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    this.logger.log(
      `Product mappings retrieval attempt for vendor: ${id}, page: ${pageNum}, limit: ${limitNum}`,
    );
    return this.vendorProductService.getProductMappings(
      vendor,
      pageNum,
      limitNum,
    );
  }
}
