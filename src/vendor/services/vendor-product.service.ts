import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { VendorService } from './vendor.service';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  UpdateVendorProductMappingDto,
  VendorProductResponseDto,
  VendorProductMappingResponseDto,
} from '../dto/vendor.dto';
import { Vendor } from '../interfaces/vendor.interface';

@Injectable()
export class VendorProductService {
  private readonly logger = new Logger(VendorProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customLogger: CustomLoggerService,
    private readonly vendorService: VendorService,
  ) {}

  async createProduct(
    vendor: Vendor,
    createProductDto: CreateVendorProductDto,
  ): Promise<VendorProductResponseDto> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const {
        storeId,
        title,
        sku,
        description,
        category,
        attributes,
        base_price,
        unit,
      } = createProductDto;

      // Log product creation attempt
      this.customLogger.logBusinessEvent(
        'product_creation_attempt',
        { vendorId: id, productTitle: title, sku },
        id,
      );

      // Check if vendor exists and is active
      const vendorRecord = await this.prisma.vendor.findFirst({
        where: { id: BigInt(id) },
      });
      if (!vendorRecord) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId: id, reason: 'vendor_not_found' },
          id,
        );
        throw new NotFoundException('Vendor not found');
      }

      if (!vendorRecord.isActive) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId: id, reason: 'vendor_not_active' },
          id,
        );
        throw new BadRequestException('Vendor is not active');
      }

      // Check if store exists and belongs to vendor
      const storeRecord = await this.prisma.store.findFirst({
        where: { id: BigInt(storeId), vendorId: BigInt(id) },
      });
      if (!storeRecord || storeRecord.vendorId !== BigInt(id)) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId: id, storeId, reason: 'store_not_found_or_not_owned' },
          id,
        );
        throw new NotFoundException('Store not found or does not belong to vendor');
      }

      // Check if product name already exists for this vendor
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          vendorId: BigInt(id),
          name: title,
        },
      });

      if (existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId: id, productTitle: title, reason: 'product_name_exists' },
          id,
        );
        throw new ConflictException(
          `Product with name '${title}' already exists for vendor ${id}`,
        );
      }

      // Create product
      const product = await this.prisma.product.create({
        data: {
          vendorId: BigInt(id),
          name: title,
          category,
          price: base_price,
          description,
          capacity: attributes?.capacity || unit,
          unit,
          stock: 0,
          stockQuantity: 0,
          isAvailable: true,
          minOrderQuantity: 1,
          maxOrderQuantity: 1000,
          areaPincodes: attributes?.areaPincodes || [],
          images: attributes?.images || [],
          specifications: {
            ...attributes?.specifications,
            sku,
          },
          hasDeposit: attributes?.hasDeposit || false,
          depositAmount: attributes?.depositAmount || 0,
        },
      });

      // Create product-store mapping
      await this.prisma.productStoreMapping.create({
        data: {
          productId: product.id,
          storeId: BigInt(storeId),
          price: base_price,
          stockQuantity: 0,
          isAvailable: true,
        },
      });

      this.customLogger.logBusinessEvent(
        'product_created',
        { vendorId: id, productId: product.id.toString(), productTitle: title },
        id,
      );

      return this.mapProductToResponseDto(product);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_creation_error',
        { vendorId: id, error: error.message },
        id,
      );
      this.logger.error(`Product creation failed for vendor ${id}:`, error);
      throw new BadRequestException('Product creation failed');
    }
  }

  async getProducts(
    vendor: Vendor,
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    category?: string,
  ): Promise<{
    products: VendorProductResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;

      // Build filter condition
      const filter: any = { vendorId: id };
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }
      if (category) {
        filter.category = category;
      }

      const query = {
        vendorId: BigInt(id),
        ...(isActive !== undefined && { isActive }),
        ...(category && { category }),
      };

      console.log('filter', filter);

      // Get products with pagination
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: query,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.product.count({
          where: query,
        }),
      ]);

      this.customLogger.logBusinessEvent(
        'products_retrieved',
        { vendorId: id, count: products.length, page, limit },
        id,
      );

      return {
        products: products.map((product) =>
          this.mapProductToResponseDto(product),
        ),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.customLogger.logBusinessEvent(
        'products_retrieval_error',
        { vendorId: id, error: error.message },
        id,
      );
      this.logger.error(`Products retrieval failed for vendor ${id}:`, error);
      throw new BadRequestException('Failed to retrieve products');
    }
  }

  async getProductById(
    vendor: Vendor,
    productId: string,
  ): Promise<VendorProductResponseDto> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const product = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(id),
        },
      });

      if (!product) {
        this.customLogger.logBusinessEvent(
          'product_retrieval_failure',
          { vendorId: id, productId, reason: 'product_not_found' },
          id,
        );
        throw new NotFoundException('Product not found');
      }

      this.customLogger.logBusinessEvent(
        'product_retrieved',
        { vendorId: id, productId },
        id,
      );

      return this.mapProductToResponseDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_retrieval_error',
        { vendorId: id, productId, error: error.message },
        id,
      );
      this.logger.error(
        `Product retrieval failed for vendor ${id}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve product');
    }
  }

  async updateProduct(
    vendor: Vendor,
    productId: string,
    updateProductDto: UpdateVendorProductDto,
  ): Promise<VendorProductResponseDto> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const {
        title,
        sku,
        description,
        category,
        attributes,
        base_price,
        unit,
        is_active,
      } = updateProductDto;

      // Check if product exists and belongs to vendor
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(id),
        },
      });

      if (!existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_update_failure',
          { vendorId: id, productId, reason: 'product_not_found' },
          id,
        );
        throw new NotFoundException('Product not found');
      }

      // Check if new name conflicts with existing products
      if (title && title !== existingProduct.name) {
        const nameConflict = await this.prisma.product.findFirst({
          where: {
            vendorId: BigInt(id),
            name: title,
            id: { not: BigInt(productId) },
          },
        });

        if (nameConflict) {
          this.customLogger.logBusinessEvent(
            'product_update_failure',
            { vendorId: id, productId, reason: 'name_conflict' },
            id,
          );
          throw new ConflictException(
            `Product with name '${title}' already exists for vendor ${id}`,
          );
        }
      }

      // Update product
      const updateData: any = {};
      if (title !== undefined) updateData.name = title;
      if (category !== undefined) updateData.category = category;
      if (base_price !== undefined) updateData.price = base_price;
      if (description !== undefined) updateData.description = description;
      if (unit !== undefined) updateData.capacity = unit;
      if (attributes?.imageUrl !== undefined)
        updateData.images = [attributes.imageUrl];
      if (is_active !== undefined) updateData.isActive = is_active;

      const updatedProduct = await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: updateData,
      });

      this.customLogger.logBusinessEvent(
        'product_updated',
        { vendorId: id, productId, productTitle: updatedProduct.name },
        id,
      );

      return this.mapProductToResponseDto(updatedProduct);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_update_error',
        { vendorId: id, productId, error: error.message },
        id,
      );
      this.logger.error(
        `Product update failed for vendor ${id}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Product update failed');
    }
  }

  async deleteProduct(vendor: Vendor, productId: string): Promise<any> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      // Check if product exists and belongs to vendor
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(id),
        },
      });

      if (!existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_deletion_failure',
          { vendorId: id, productId, reason: 'product_not_found' },
          id,
        );
        throw new NotFoundException('Product not found');
      }

      // Soft delete by setting isActive to false
      await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: { isActive: false },
      });

      this.customLogger.logBusinessEvent(
        'product_deleted',
        { vendorId: id, productId, productTitle: existingProduct.name },
        id,
      );
      return {
        message: 'Deleted',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_deletion_error',
        { vendorId: id, productId, error: error.message },
        id,
      );
      this.logger.error(
        `Product deletion failed for vendor ${id}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Product deletion failed');
    }
  }





  async updateProductMapping(
    vendor: Vendor,
    mappingId: string,
    updateProductMappingDto: UpdateVendorProductMappingDto,
  ): Promise<VendorProductMappingResponseDto> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const { price, stock, area_pincodes, is_active } =
        updateProductMappingDto;

      // Check if mapping exists and belongs to vendor (through product relationship)
      const existingMapping = await this.prisma.productStoreMapping.findFirst({
        where: {
          id: BigInt(mappingId),
          product: {
            vendorId: BigInt(id),
          },
        },
        include: {
          product: true,
        },
      });

      if (!existingMapping) {
        throw new NotFoundException('Product mapping not found');
      }

      // Update mapping
      const updateData: any = {};
      if (price !== undefined) updateData.price = price;
      if (stock !== undefined) updateData.stockQuantity = stock;
      if (area_pincodes !== undefined) updateData.areaPincodes = area_pincodes;
      if (is_active !== undefined) updateData.isAvailable = is_active;

      const updatedMapping = await this.prisma.productStoreMapping.update({
        where: { id: BigInt(mappingId) },
        data: updateData,
      });

      this.customLogger.logBusinessEvent(
        'product_mapping_updated',
        { vendorId: id, mappingId },
        id,
      );

      return this.mapMappingToResponseDto(existingMapping.product, mappingId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Product mapping update failed for vendor ${id}, mapping ${mappingId}:`,
        error,
      );
      throw new BadRequestException('Product mapping update failed');
    }
  }


  private mapProductToResponseDto(product: any): VendorProductResponseDto {
    return {
      id: product.id.toString(),
      vendor_id: product.vendorId.toString(),
      title: product.name,
      sku:
        product.specifications?.sku ||
        product.name.toLowerCase().replace(/\s+/g, '-'),
      description: product.description,
      category: product.category,
      attributes: {
        imageUrl: product.images?.[0],
        specifications: product.specifications,
        hasDeposit: product.hasDeposit,
        depositAmount: product.depositAmount,
      },
      base_price: product.price,
      unit: product.capacity,
      is_active: product.isActive,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }


  private mapMappingToResponseDto(
    product: any,
    storeId: string,
  ): VendorProductMappingResponseDto {
    const mapping = product.storeMappings?.find((m) => m.storeId === storeId);
    return {
      id: `${product.id.toString()}-${storeId}`,
      product_id: product.id.toString(),
      store_id: storeId,
      product_variant_id: product.id.toString(),
      price: mapping?.price || product.price,
      stock: mapping?.stockQuantity || 0,
      reserved_stock: mapping?.reservedStock || 0,
      area_pincodes: mapping?.areaPincodes || [],
      is_active: mapping?.isAvailable || false,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }
}
