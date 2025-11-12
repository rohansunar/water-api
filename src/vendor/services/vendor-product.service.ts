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
  CreateVendorProductVariantDto,
  UpdateVendorProductVariantDto,
  CreateVendorProductMappingDto,
  UpdateVendorProductMappingDto,
  VendorProductResponseDto,
  VendorProductVariantResponseDto,
  VendorProductMappingResponseDto,
} from '../dto/vendor.dto';

@Injectable()
export class VendorProductService {
  private readonly logger = new Logger(VendorProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customLogger: CustomLoggerService,
    private readonly vendorService: VendorService,
  ) {}

  async createProduct(
    vendorId: string,
    createProductDto: CreateVendorProductDto,
  ): Promise<VendorProductResponseDto> {
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
      } = createProductDto;

      // Log product creation attempt
      this.customLogger.logBusinessEvent(
        'product_creation_attempt',
        { vendorId, productTitle: title, sku },
        vendorId,
      );

      // Check if vendor exists and is active
      const vendor = await this.prisma.vendor.findFirst({where:{id: BigInt(vendorId)}});
      if (!vendor) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId, reason: 'vendor_not_found' },
          vendorId,
        );
        throw new NotFoundException('Vendor not found');
      }

      if (!vendor.isActive) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId, reason: 'vendor_not_active' },
          vendorId,
        );
        throw new BadRequestException('Vendor is not active');
      }

      // Check if product name already exists for this vendor
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          vendorId: BigInt(vendorId),
          name: title,
        },
      });

      if (existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId, productTitle: title, reason: 'product_name_exists' },
          vendorId,
        );
        throw new ConflictException(
          `Product with name '${title}' already exists for vendor ${vendorId}`,
        );
      }

      // Create product
      const product = await this.prisma.product.create({
        data: {
          vendorId: BigInt(vendorId),
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

      this.customLogger.logBusinessEvent(
        'product_created',
        { vendorId, productId: product.id.toString(), productTitle: title },
        vendorId,
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
        { vendorId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Product creation failed for vendor ${vendorId}:`,
        error,
      );
      throw new BadRequestException('Product creation failed');
    }
  }

  async getProducts(
    vendorId: string,
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
    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;

      // Build filter condition
      const filter: any = { vendorId };
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }
      if (category) {
        filter.category = category;
      }
      
      console.log("filter",filter)

      // Get products with pagination
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: {
            vendorId: BigInt(vendorId),
            ...(isActive !== undefined && { isActive }),
            ...(category && { category }),
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.product.count({
          where: {
            vendorId: BigInt(vendorId),
            ...(isActive !== undefined && { isActive }),
            ...(category && { category }),
          },
        }),
      ]);

      this.customLogger.logBusinessEvent(
        'products_retrieved',
        { vendorId, count: products.length, page, limit },
        vendorId,
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
        { vendorId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Products retrieval failed for vendor ${vendorId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve products');
    }
  }

  async getProductById(
    vendorId: string,
    productId: string,
  ): Promise<VendorProductResponseDto> {
    const startTime = Date.now();
    try {
      const product = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(vendorId),
        },
      });

      if (!product) {
        this.customLogger.logBusinessEvent(
          'product_retrieval_failure',
          { vendorId, productId, reason: 'product_not_found' },
          vendorId,
        );
        throw new NotFoundException('Product not found');
      }

      this.customLogger.logBusinessEvent(
        'product_retrieved',
        { vendorId, productId },
        vendorId,
      );

      return this.mapProductToResponseDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_retrieval_error',
        { vendorId, productId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Product retrieval failed for vendor ${vendorId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve product');
    }
  }

  async updateProduct(
    vendorId: string,
    productId: string,
    updateProductDto: UpdateVendorProductDto,
  ): Promise<VendorProductResponseDto> {
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
          vendorId: BigInt(vendorId),
        },
      });

      if (!existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_update_failure',
          { vendorId, productId, reason: 'product_not_found' },
          vendorId,
        );
        throw new NotFoundException('Product not found');
      }

      // Check if new name conflicts with existing products
      if (title && title !== existingProduct.name) {
        const nameConflict = await this.prisma.product.findFirst({
          where: {
            vendorId: BigInt(vendorId),
            name: title,
            id: { not: BigInt(productId) },
          },
        });

        if (nameConflict) {
          this.customLogger.logBusinessEvent(
            'product_update_failure',
            { vendorId, productId, reason: 'name_conflict' },
            vendorId,
          );
          throw new ConflictException(
            `Product with name '${title}' already exists for vendor ${vendorId}`,
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
        { vendorId, productId, productTitle: updatedProduct.name },
        vendorId,
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
        { vendorId, productId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Product update failed for vendor ${vendorId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Product update failed');
    }
  }

  async deleteProduct(vendorId: string, productId: string): Promise<any> {
    const startTime = Date.now();
    try {
      // Check if product exists and belongs to vendor
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(vendorId),
        },
      });

      if (!existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_deletion_failure',
          { vendorId, productId, reason: 'product_not_found' },
          vendorId,
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
        { vendorId, productId, productTitle: existingProduct.name },
        vendorId,
      );
      return {
       message :"Deleted"
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_deletion_error',
        { vendorId, productId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Product deletion failed for vendor ${vendorId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Product deletion failed');
    }
  }

  async createProductVariant(
    vendorId: string,
    productId: string,
    createProductVariantDto: CreateVendorProductVariantDto,
  ): Promise<VendorProductVariantResponseDto> {
    const startTime = Date.now();
    try {
      const { variant_sku, attributes, price_override } =
        createProductVariantDto;

      // Check if product exists and belongs to vendor
      const product = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(vendorId),
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if variant SKU already exists in specifications
      if (product.specifications && (product.specifications as any).sku === variant_sku) {
        throw new ConflictException(
          `Product variant with SKU '${variant_sku}' already exists for product ${productId}`,
        );
      }

      // Update product with variant information
      const updatedSpecifications = {
        ...(product.specifications as any || {}),
        sku: variant_sku,
        ...attributes,
      };

      const updateData: any = {
        specifications: updatedSpecifications,
      };

      if (price_override !== undefined) {
        updateData.price = price_override;
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: updateData,
      });

      this.customLogger.logBusinessEvent(
        'product_variant_created',
        { vendorId, productId, variantSku: variant_sku },
        vendorId,
      );

      return this.mapVariantToResponseDto(updatedProduct, productId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Product variant creation failed for vendor ${vendorId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Product variant creation failed');
    }
  }

  async updateProductVariant(
    vendorId: string,
    variantId: string,
    updateProductVariantDto: UpdateVendorProductVariantDto,
  ): Promise<VendorProductVariantResponseDto> {
    const startTime = Date.now();
    try {
      const { attributes, price_override, is_active } = updateProductVariantDto;

      // Check if product exists and belongs to vendor
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          id: BigInt(variantId),
          vendorId: BigInt(vendorId),
        },
      });

      if (!existingProduct) {
        throw new NotFoundException('Product variant not found');
      }

      // Update variant
      const updateData: any = {};
      if (price_override !== undefined) updateData.price = price_override;
      if (attributes) {
        updateData.specifications = {
          ...(existingProduct.specifications as any || {}),
          ...attributes,
        };
      }
      if (is_active !== undefined) updateData.isActive = is_active;

      const updatedProduct = await this.prisma.product.update({
        where: { id: BigInt(variantId) },
        data: updateData,
      });

      this.customLogger.logBusinessEvent(
        'product_variant_updated',
        { vendorId, variantId },
        vendorId,
      );

      return this.mapVariantToResponseDto(updatedProduct, variantId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Product variant update failed for vendor ${vendorId}, variant ${variantId}:`,
        error,
      );
      throw new BadRequestException('Product variant update failed');
    }
  }

  async deleteProductVariant(
    vendorId: string,
    variantId: string,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      // Check if product exists and belongs to vendor
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          id: BigInt(variantId),
          vendorId: BigInt(vendorId),
        },
      });

      if (!existingProduct) {
        throw new NotFoundException('Product variant not found');
      }

      // Reset variant-specific data
      const currentSpecs = existingProduct.specifications as any || {};
      const updatedSpecs = { ...currentSpecs };
      delete updatedSpecs.sku;

      await this.prisma.product.update({
        where: { id: BigInt(variantId) },
        data: {
          specifications: updatedSpecs,
          price: existingProduct.price, // Keep original price
          isActive: false,
        },
      });

      this.customLogger.logBusinessEvent(
        'product_variant_deleted',
        { vendorId, variantId },
        vendorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Product variant deletion failed for vendor ${vendorId}, variant ${variantId}:`,
        error,
      );
      throw new BadRequestException('Product variant deletion failed');
    }
  }

  async createProductMapping(
    vendorId: string,
    createProductMappingDto: CreateVendorProductMappingDto,
  ): Promise<VendorProductMappingResponseDto> {
    const startTime = Date.now();
    try {
      const { store_id, product_variant_id, price, stock, area_pincodes } =
        createProductMappingDto;

      // Check if store exists and belongs to vendor
      const store = await this.prisma.vendorStore.findFirst({
        where: {
          id: BigInt(store_id),
          vendorId: BigInt(vendorId),
        },
      });

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      // Check if product exists and belongs to vendor
      const product = await this.prisma.product.findFirst({
        where: {
          id: BigInt(product_variant_id),
          vendorId: BigInt(vendorId),
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if mapping already exists
      const existingMapping = await this.prisma.productStoreMapping.findFirst({
        where: {
          productId: BigInt(product_variant_id),
          storeId: BigInt(store_id),
        },
      });

      if (existingMapping) {
        throw new ConflictException(
          `Product mapping already exists for product ${product_variant_id} in store ${store_id}`,
        );
      }

      // Create product mapping using ProductStoreMapping table
      const mapping = await this.prisma.productStoreMapping.create({
        data: {
          productId: BigInt(product_variant_id),
          storeId: BigInt(store_id),
          price: price || product.price,
          stockQuantity: stock || 0,
          reservedStock: 0,
          isAvailable: true,
          areaPincodes: area_pincodes || [],
        },
      });

      this.customLogger.logBusinessEvent(
        'product_mapping_created',
        { vendorId, storeId: store_id, productId: product_variant_id },
        vendorId,
      );

      return this.mapMappingToResponseDto(product, store_id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Product mapping creation failed for vendor ${vendorId}:`,
        error,
      );
      throw new BadRequestException('Product mapping creation failed');
    }
  }

  async updateProductMapping(
    vendorId: string,
    mappingId: string,
    updateProductMappingDto: UpdateVendorProductMappingDto,
  ): Promise<VendorProductMappingResponseDto> {
    const startTime = Date.now();
    try {
      const { price, stock, area_pincodes, is_active } =
        updateProductMappingDto;

      // Check if mapping exists and belongs to vendor (through product relationship)
      const existingMapping = await this.prisma.productStoreMapping.findFirst({
        where: {
          id: BigInt(mappingId),
          product: {
            vendorId: BigInt(vendorId),
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
        { vendorId, mappingId },
        vendorId,
      );

      return this.mapMappingToResponseDto(existingMapping.product, mappingId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Product mapping update failed for vendor ${vendorId}, mapping ${mappingId}:`,
        error,
      );
      throw new BadRequestException('Product mapping update failed');
    }
  }

  async getProductMappings(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    mappings: VendorProductMappingResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;

      // Get product mappings with related data
      const [mappingsData, total] = await Promise.all([
        this.prisma.productStoreMapping.findMany({
          where: {
            product: {
              vendorId: BigInt(vendorId),
            },
          },
          include: {
            product: true,
            store: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.productStoreMapping.count({
          where: {
            product: {
              vendorId: BigInt(vendorId),
            },
          },
        }),
      ]);

      this.customLogger.logBusinessEvent(
        'product_mappings_retrieved',
        { vendorId, count: mappingsData.length, page, limit },
        vendorId,
      );

      const mappings: VendorProductMappingResponseDto[] = mappingsData.map((mapping) =>
        this.mapMappingToResponseDto(mapping.product, mapping.storeId.toString()),
      );

      return {
        mappings,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Product mappings retrieval failed for vendor ${vendorId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve product mappings');
    }
  }

  private mapProductToResponseDto(
    product: any,
  ): VendorProductResponseDto {
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

  private mapVariantToResponseDto(
    product: any,
    productId: string,
  ): VendorProductVariantResponseDto {
    return {
      id: product.id.toString(),
      product_id: productId,
      variant_sku:
        product.specifications?.sku || `VARIANT-${product.id.toString()}`,
      attributes: product.specifications || {},
      price_override: product.price,
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
