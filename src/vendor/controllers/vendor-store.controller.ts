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
import { VendorStoreService } from '../services/vendor-store.service';
import {
  CreateStoreDto,
  UpdateStoreDto,
  StoreResponseDto,
  CreateStoreAddressDto,
  UpdateStoreAddressDto,
  StoreAddressResponseDto,
} from '../dto/vendor.dto';
import { VendorJwtAuthGuard } from '../../product/guards/vendor-jwt-auth.guard';
import { CurrentVendor } from '../../product/decorators/current-vendor.decorator';
import { Vendor } from '../../product/interfaces/vendor.interface';

@ApiTags('Vendor Stores')
@Controller('vendors/me/stores')
@UseGuards(VendorJwtAuthGuard)
export class VendorStoreController {
  private readonly logger = new Logger(VendorStoreController.name);

  constructor(private readonly vendorStoreService: VendorStoreService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new store',
    description: 'Create a new store for the authenticated vendor',
  })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({
    status: 201,
    description: 'Store created successfully',
    type: StoreResponseDto,
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
    description: 'Store with this name already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Store with this name already exists for this vendor',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async createStore(
    @Body() createStoreDto: CreateStoreDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<StoreResponseDto> {
    this.logger.log(
      `Store creation attempt for vendor: ${vendor.id}, store name: ${createStoreDto.name}`,
    );
    return this.vendorStoreService.createStore(vendor, createStoreDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all stores',
    description:
      'Retrieve all stores for the authenticated vendor with pagination and filtering',
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
  @ApiResponse({
    status: 200,
    description: 'Stores retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stores: {
          type: 'array',
          items: { $ref: '#/components/schemas/StoreResponseDto' },
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
        message: { type: 'string', example: 'Failed to retrieve stores' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getStores(
    @CurrentVendor() vendor: Vendor,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ): Promise<{
    stores: StoreResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isActiveBool =
      isActive !== undefined ? isActive === 'true' : undefined;

    this.logger.log(
      `Stores retrieval attempt for vendor: ${vendor.id}, page: ${pageNum}, limit: ${limitNum}`,
    );
    return this.vendorStoreService.getStores(
      vendor,
      pageNum,
      limitNum,
      isActiveBool,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get store by ID',
    description:
      'Retrieve a specific store by its ID for the authenticated vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Store retrieved successfully',
    type: StoreResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Store not found',
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
    status: 400,
    description: 'Invalid store ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Failed to retrieve store' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getStoreById(
    @Param('id') storeId: string,
    @CurrentVendor() vendor: Vendor,
  ): Promise<StoreResponseDto> {
    this.logger.log(
      `Store retrieval attempt for vendor: ${vendor.id}, store ID: ${storeId}`,
    );
    return this.vendorStoreService.getStoreById(vendor, storeId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update store',
    description: 'Update a specific store for the authenticated vendor',
  })
  @ApiBody({ type: UpdateStoreDto })
  @ApiResponse({
    status: 200,
    description: 'Store updated successfully',
    type: StoreResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Store not found',
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
    description: 'Store with this name already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Store with this name already exists for this vendor',
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
        message: { type: 'string', example: 'Store update failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async updateStore(
    @Param('id') storeId: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<StoreResponseDto> {
    this.logger.log(
      `Store update attempt for vendor: ${vendor.id}, store ID: ${storeId}`,
    );
    return this.vendorStoreService.updateStore(vendor, storeId, updateStoreDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete store (soft delete)',
    description: 'Soft delete a specific store for the authenticated vendor',
  })
  @ApiResponse({
    status: 204,
    description: 'Store deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Store not found',
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
    status: 400,
    description: 'Store deletion failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Store deletion failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async deleteStore(
    @Param('id') storeId: string,
    @CurrentVendor() vendor: Vendor,
  ): Promise<void> {
    this.logger.log(
      `Store deletion attempt for vendor: ${vendor.id}, store ID: ${storeId}`,
    );
    await this.vendorStoreService.deleteStore(vendor, storeId);
  }

  @Post(':storeId/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a store address',
    description: 'Create a new address for the specified store',
  })
  @ApiBody({ type: CreateStoreAddressDto })
  @ApiResponse({
    status: 201,
    description: 'Store address created successfully',
    type: StoreAddressResponseDto,
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
    description: 'Store not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Store not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async createStoreAddress(
    @Param('storeId') storeId: string,
    @Body() createStoreAddressDto: CreateStoreAddressDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<StoreAddressResponseDto> {
    this.logger.log(
      `Creating store address for store ${storeId} by vendor user: ${vendor.id}`,
    );
    return this.vendorStoreService.createStoreAddress(
      vendor,
      storeId,
      createStoreAddressDto,
    );
  }

  @Put(':storeId/addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a store address',
    description: 'Update an existing address for the specified store',
  })
  @ApiBody({ type: UpdateStoreAddressDto })
  @ApiResponse({
    status: 200,
    description: 'Store address updated successfully',
    type: StoreAddressResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Store address not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Store address not found' },
        error: { type: 'string', example: 'Not Found' },
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
        message: { type: 'string', example: 'Store address update failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async updateStoreAddress(
    @Param('storeId') storeId: string,
    @Param('addressId') addressId: string,
    @Body() updateStoreAddressDto: UpdateStoreAddressDto,
    @CurrentVendor() vendor: Vendor,
  ): Promise<StoreAddressResponseDto> {
    this.logger.log(
      `Updating store address ${addressId} for store ${storeId} by vendor user: ${vendor.id}`,
    );
    return this.vendorStoreService.updateStoreAddress(
      vendor,
      storeId,
      addressId,
      updateStoreAddressDto,
    );
  }
}
