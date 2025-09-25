import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../common/schemas/product.schema';
import { VendorStore, VendorStoreDocument } from '../common/schemas/vendor-store.schema';
import { CustomLoggerService } from '../common/logger/logger.service';
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
} from '../common/dto/vendor.dto';

@Injectable()
export class VendorProductService {
  private readonly logger = new Logger(VendorProductService.name);

  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(VendorStore.name)
    private storeModel: Model<VendorStoreDocument>,
    private readonly customLogger: CustomLoggerService,
    private readonly vendorService: VendorService,
  ) {}

  async createProduct(
    vendorId: string,
    createProductDto: CreateVendorProductDto,
  ): Promise<VendorProductResponseDto> {
    const startTime = Date.now();
    try {
      const { title, sku, description, category, attributes, base_price, unit } = createProductDto;

      // Log product creation attempt
      this.customLogger.logBusinessEvent(
        'product_creation_attempt',
        { vendorId, productTitle: title, sku },
        vendorId,
      );

      // Check if vendor exists and is active
      const vendor = await this.vendorService.findById(vendorId);
      if (!vendor) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId, reason: 'vendor_not_found' },
          vendorId,
        );
        throw new NotFoundException('Vendor not found');
      }

      // Check if product name already exists for this vendor
      const existingProduct = await this.productModel.findOne({
        vendorId,
        name: title,
      });

      if (existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { vendorId, productTitle: title, reason: 'product_name_exists' },
          vendorId,
        );
        throw new ConflictException('Product with this name already exists for this vendor');
      }

      // Create product
      const product = await this.productModel.create({
        vendorId,
        name: title,
        category,
        price: base_price,
        description,
        capacity: unit,
        stock: 0,
        isAvailable: true,
        stockQuantity: 0,
        isActive: true,
        minOrderQuantity: 1,
        maxOrderQuantity: 1000,
        areaPincodes: attributes?.areaPincodes || [],
        images: attributes?.images || [],
        specifications: attributes?.specifications || {},
        hasDeposit: attributes?.hasDeposit || false,
        depositAmount: attributes?.depositAmount || 0,
      });

      this.customLogger.logBusinessEvent(
        'product_created',
        { vendorId, productId: product._id.toString(), productTitle: title },
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
      this.logger.error(`Product creation failed for vendor ${vendorId}:`, error);
      throw new BadRequestException('Product creation failed');
    }
  }

  async getProducts(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    category?: string,
  ): Promise<{ products: VendorProductResponseDto[]; total: number; page: number; limit: number }> {
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

      // Get products with pagination
      const [products, total] = await Promise.all([
        this.productModel
          .find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.productModel.countDocuments(filter).exec(),
      ]);

      this.customLogger.logBusinessEvent(
        'products_retrieved',
        { vendorId, count: products.length, page, limit },
        vendorId,
      );

      return {
        products: products.map((product) => this.mapProductToResponseDto(product)),
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
      this.logger.error(`Products retrieval failed for vendor ${vendorId}:`, error);
      throw new BadRequestException('Failed to retrieve products');
    }
  }

  async getProductById(vendorId: string, productId: string): Promise<VendorProductResponseDto> {
    const startTime = Date.now();
    try {
      const product = await this.productModel.findOne({
        _id: productId,
        vendorId,
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
      this.logger.error(`Product retrieval failed for vendor ${vendorId}, product ${productId}:`, error);
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
      const { title, sku, description, category, attributes, base_price, unit, is_active } = updateProductDto;

      // Check if product exists and belongs to vendor
      const existingProduct = await this.productModel.findOne({
        _id: productId,
        vendorId,
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
        const nameConflict = await this.productModel.findOne({
          vendorId,
          name: title,
          _id: { $ne: productId },
        });

        if (nameConflict) {
          this.customLogger.logBusinessEvent(
            'product_update_failure',
            { vendorId, productId, reason: 'name_conflict' },
            vendorId,
          );
          throw new ConflictException('Product with this name already exists for this vendor');
        }
      }

      // Update product
      const updateData: any = {};
      if (title !== undefined) updateData.name = title;
      if (category !== undefined) updateData.category = category;
      if (base_price !== undefined) updateData.price = base_price;
      if (description !== undefined) updateData.description = description;
      if (unit !== undefined) updateData.capacity = unit;
      if (attributes?.imageUrl !== undefined) updateData.images = [attributes.imageUrl];
      if (is_active !== undefined) updateData.isActive = is_active;

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(productId, updateData, { new: true })
        .exec();

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
      this.logger.error(`Product update failed for vendor ${vendorId}, product ${productId}:`, error);
      throw new BadRequestException('Product update failed');
    }
  }

  async deleteProduct(vendorId: string, productId: string): Promise<void> {
    const startTime = Date.now();
    try {
      // Check if product exists and belongs to vendor
      const existingProduct = await this.productModel.findOne({
        _id: productId,
        vendorId,
      });

      if (!existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_deletion_failure',
          { vendorId, productId, reason: 'product_not_found' },
          vendorId,
        );
        throw new NotFoundException('Product not found');
      }

      // Soft delete by setting is_active to false
      await this.productModel
        .findByIdAndUpdate(productId, { isActive: false })
        .exec();

      this.customLogger.logBusinessEvent(
        'product_deleted',
        { vendorId, productId, productTitle: existingProduct.name },
        vendorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_deletion_error',
        { vendorId, productId, error: error.message },
        vendorId,
      );
      this.logger.error(`Product deletion failed for vendor ${vendorId}, product ${productId}:`, error);
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
      const { variant_sku, attributes, price_override } = createProductVariantDto;

      // Check if product exists and belongs to vendor
      const product = await this.productModel.findOne({
        _id: productId,
        vendorId,
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if variant SKU already exists
      const existingVariant = await this.productModel.findOne({
        _id: productId,
        'specifications.sku': variant_sku,
      });

      if (existingVariant) {
        throw new ConflictException('Product variant already exists');
      }

      // Update product with variant information
      const variantData: any = {
        specifications: {
          ...product.specifications,
          sku: variant_sku,
          ...attributes,
        },
      };

      if (price_override !== undefined) {
        variantData.price = price_override;
      }

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(productId, variantData, { new: true })
        .exec();

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
      this.logger.error(`Product variant creation failed for vendor ${vendorId}, product ${productId}:`, error);
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
      const existingProduct = await this.productModel.findOne({
        _id: variantId,
        vendorId,
      });

      if (!existingProduct) {
        throw new NotFoundException('Product variant not found');
      }

      // Update variant
      const updateData: any = {};
      if (price_override !== undefined) updateData.price = price_override;
      if (attributes) {
        updateData.specifications = {
          ...existingProduct.specifications,
          ...attributes,
        };
      }
      if (is_active !== undefined) updateData.isActive = is_active;

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(variantId, updateData, { new: true })
        .exec();

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
      this.logger.error(`Product variant update failed for vendor ${vendorId}, variant ${variantId}:`, error);
      throw new BadRequestException('Product variant update failed');
    }
  }

  async deleteProductVariant(vendorId: string, variantId: string): Promise<void> {
    const startTime = Date.now();
    try {
      // Check if product exists and belongs to vendor
      const existingProduct = await this.productModel.findOne({
        _id: variantId,
        vendorId,
      });

      if (!existingProduct) {
        throw new NotFoundException('Product variant not found');
      }

      // Reset variant-specific data
      await this.productModel
        .findByIdAndUpdate(variantId, {
          $unset: { 'specifications.sku': 1 },
          price: undefined,
          isActive: false,
        })
        .exec();

      this.customLogger.logBusinessEvent(
        'product_variant_deleted',
        { vendorId, variantId },
        vendorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Product variant deletion failed for vendor ${vendorId}, variant ${variantId}:`, error);
      throw new BadRequestException('Product variant deletion failed');
    }
  }

  async createProductMapping(
    vendorId: string,
    createProductMappingDto: CreateVendorProductMappingDto,
  ): Promise<VendorProductMappingResponseDto> {
    const startTime = Date.now();
    try {
      const { store_id, product_variant_id, price, stock, area_pincodes } = createProductMappingDto;

      // Check if store exists and belongs to vendor
      const store = await this.storeModel.findOne({
        _id: store_id,
        vendorId,
      });

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      // Check if product exists and belongs to vendor
      const product = await this.productModel.findOne({
        _id: product_variant_id,
        vendorId,
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if mapping already exists
      const existingMapping = await this.productModel.findOne({
        _id: product_variant_id,
        'storeMappings.storeId': store_id,
      });

      if (existingMapping) {
        throw new ConflictException('Product mapping already exists for this store');
      }

      // Create product mapping by updating product with store mapping
      const mappingData = {
        storeId: store_id,
        price: price || product.price,
        stockQuantity: stock || 0,
        reservedStock: 0,
        isAvailable: true,
        areaPincodes: area_pincodes || [],
      };

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(
          product_variant_id,
          { $push: { storeMappings: mappingData } },
          { new: true }
        )
        .exec();

      this.customLogger.logBusinessEvent(
        'product_mapping_created',
        { vendorId, storeId: store_id, productId: product_variant_id },
        vendorId,
      );

      return this.mapMappingToResponseDto(updatedProduct, store_id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`Product mapping creation failed for vendor ${vendorId}:`, error);
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
      const { price, stock, area_pincodes, is_active } = updateProductMappingDto;

      // Check if product exists and belongs to vendor
      const existingProduct = await this.productModel.findOne({
        _id: mappingId,
        vendorId,
      });

      if (!existingProduct) {
        throw new NotFoundException('Product mapping not found');
      }

      // Update mapping
      const updateData: any = {};
      if (price !== undefined) updateData.price = price;
      if (stock !== undefined) updateData.stockQuantity = stock;
      if (area_pincodes !== undefined) updateData.areaPincodes = area_pincodes;
      if (is_active !== undefined) updateData.isAvailable = is_active;

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(mappingId, updateData, { new: true })
        .exec();

      this.customLogger.logBusinessEvent(
        'product_mapping_updated',
        { vendorId, mappingId },
        vendorId,
      );

      return this.mapMappingToResponseDto(updatedProduct, mappingId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Product mapping update failed for vendor ${vendorId}, mapping ${mappingId}:`, error);
      throw new BadRequestException('Product mapping update failed');
    }
  }

  async getProductMappings(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ mappings: VendorProductMappingResponseDto[]; total: number; page: number; limit: number }> {
    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;

      // Get products with store mappings
      const [products, total] = await Promise.all([
        this.productModel
          .find({ vendorId })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.productModel.countDocuments({ vendorId }).exec(),
      ]);

      this.customLogger.logBusinessEvent(
        'product_mappings_retrieved',
        { vendorId, count: products.length, page, limit },
        vendorId,
      );

      const mappings: VendorProductMappingResponseDto[] = [];
      products.forEach((product) => {
        if (product.storeMappings && product.storeMappings.length > 0) {
          product.storeMappings.forEach((mapping) => {
            mappings.push(this.mapMappingToResponseDto(product, mapping.storeId));
          });
        }
      });

      return {
        mappings,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Product mappings retrieval failed for vendor ${vendorId}:`, error);
      throw new BadRequestException('Failed to retrieve product mappings');
    }
  }

  private mapProductToResponseDto(product: ProductDocument): VendorProductResponseDto {
    return {
      id: product._id.toString(),
      vendor_id: product.vendorId,
      title: product.name,
      sku: product.specifications?.sku || product.name.toLowerCase().replace(/\s+/g, '-'),
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

  private mapVariantToResponseDto(product: ProductDocument, productId: string): VendorProductVariantResponseDto {
    return {
      id: product._id.toString(),
      product_id: productId,
      variant_sku: product.specifications?.sku || `VARIANT-${product._id.toString()}`,
      attributes: product.specifications || {},
      price_override: product.price,
      is_active: product.isActive,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  private mapMappingToResponseDto(product: ProductDocument, storeId: string): VendorProductMappingResponseDto {
    const mapping = product.storeMappings?.find(m => m.storeId === storeId);
    return {
      id: `${product._id.toString()}-${storeId}`,
      product_id: product._id.toString(),
      store_id: storeId,
      product_variant_id: product._id.toString(),
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