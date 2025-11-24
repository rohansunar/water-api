import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConflictException } from '../../common/exceptions/business.exception';
import { Product } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { ProductModerationService } from './product-moderation.service';
import { ImageProcessingService } from '../../common/services/image-processing.service';
import { S3Service } from '../../common/services/s3.service';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateProductMappingDto,
  ProductResponseDto,
  ProductMappingResponseDto,
  UploadProductImagesResponseDto,
  ProductImageResponseDto,
} from '../dto/product.dto';

// Additional interfaces for better type safety
interface ProductSearchQuery {
  query?: string;
  pincode?: string;
  category?: string;
  page?: number;
  limit?: number;
}

interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype?: string;
  size?: number;
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private readonly DEFAULT_PAGE_LIMIT = 10;
  private readonly DEFAULT_PAGE = 1;
  private readonly MAX_PRODUCT_IMAGES = 10;
  private readonly MIN_ORDER_QUANTITY = 1;
  private readonly MAX_ORDER_QUANTITY = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly customLogger: CustomLoggerService,
    private readonly productModerationService: ProductModerationService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Builds a query object with role-based filtering
   */
  private buildRoleBasedQuery(
    baseQuery: any,
    user: { id: string; role: string; vendorId?: string },
  ): any {
    const { role, vendorId } = user;
    if (role === 'vendor') {
      if (!vendorId) {
        throw new BadRequestException('Vendor ID not found for user');
      }
      baseQuery.vendorId = BigInt(vendorId);
    }
    return baseQuery;
  }

  /**
   * Validates that a product exists and belongs to the user based on their role
   */
  private async validateProductOwnership(
    productId: string,
    user: { id: string; role: string; vendorId?: string },
  ): Promise<Product> {
    const query = this.buildRoleBasedQuery({ id: BigInt(productId) }, user);
    const product = await this.prisma.product.findFirst({ where: query });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  /**
   * Validates vendor and store ownership
   */
  private async validateVendorAndStore(
    vendorId: string,
    storeId: string,
  ): Promise<{ vendor: any; store: any }> {
    // Check if vendor exists and is active
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: BigInt(vendorId) },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    if (!vendor.isActive) {
      throw new BadRequestException('Vendor is not active');
    }

    // Check if store exists and belongs to vendor
    const store = await this.prisma.store.findFirst({
      where: { id: BigInt(storeId), vendorId: BigInt(vendorId) },
    });
    if (!store || store.vendorId !== BigInt(vendorId)) {
      throw new NotFoundException(
        'Store not found or does not belong to vendor',
      );
    }

    return { vendor, store };
  }

  /**
   * Standardized business event logging with error handling
   */
  private logBusinessEvent(
    event: string,
    data: Record<string, any>,
    userId: string,
  ): void {
    try {
      this.customLogger.logBusinessEvent(event, data, userId);
    } catch (error) {
      this.logger.warn(`Failed to log business event ${event}:`, error);
    }
  }

  async findById(id: string): Promise<Product | null> {
    try {
      return await this.prisma.product.findUnique({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      this.logger.error(`Error finding product by ID ${id}:`, error);
      return null;
    }
  }

  async updateStock(id: string, quantityChange: number): Promise<Product> {
    try {
      const product = await this.findById(id);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const newStock = product.stock + quantityChange;
      if (newStock < 0) {
        throw new ConflictException(
          `Cannot reduce stock below zero for product ${id}. Current stock: ${product.stock}, Requested reduction: ${quantityChange}`,
          {
            productId: id,
            available: product.stock,
            required: Math.abs(quantityChange),
            metadata: { vendorId: product.vendorId.toString() },
          },
        );
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id: BigInt(id) },
        data: { stock: newStock },
      });

      this.logger.log(`Updated stock for product ${id}: ${quantityChange}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating stock for product ${id}:`, error);
      throw error;
    }
  }

  async searchProducts(searchDto: ProductSearchQuery): Promise<any> {
    try {
      const { query, pincode, category, page = 1, limit = 20 } = searchDto;
      const skip = (page - 1) * limit;

      // Build search query
      const where: any = { isAvailable: true };

      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      // For now, we'll ignore pincode filtering as vendor location logic needs to be implemented
      // In a real implementation, you'd join with vendor/store data and filter by delivery zones

      const total = await this.prisma.product.count({ where });
      const products = await this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const totalPages = Math.ceil(total / limit);

      // Transform to search result format
      const searchResults = products.map((product) => ({
        id: product.id.toString(),
        name: product.name,
        category: product.category,
        subcategory: product.capacity, // Using capacity as subcategory
        price: Number(product.price),
        store: {
          id: product.vendorId.toString(),
          name: 'Default Store', // TODO: Get from vendor data
          rating: 4.5, // TODO: Calculate from reviews
          distance_km: 2.3, // TODO: Calculate based on user location
        },
        is_available: product.isAvailable,
        stock_quantity: product.stock,
      }));

      return {
        products: searchResults,
        meta: {
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Validates input for product creation
   */
  private validateCreateProductInput(
    user: { id: string; role: string; vendorId?: string },
    createProductDto: CreateProductDto,
  ): { vendorId: string; validatedDto: CreateProductDto } {
    const { id: userId, role, vendorId: userVendorId } = user;

    // Determine vendorId based on role
    let vendorId: string;
    if (role === 'vendor') {
      if (!userVendorId) {
        throw new BadRequestException('Vendor ID not found for user');
      }
      vendorId = userVendorId;
    } else if (role === 'admin') {
      // For admin, vendorId could be passed in dto or default
      vendorId = userId; // or from dto
    } else {
      throw new BadRequestException('Invalid user role');
    }

    return { vendorId, validatedDto: createProductDto };
  }

  /**
   * Creates the product record in database
   */
  private async createProductRecord(
    vendorId: string,
    storeId: string,
    createProductDto: CreateProductDto,
  ): Promise<Product> {
    const { title, sku, description, category, attributes, base_price, unit } =
      createProductDto;

    // Check if product name already exists for this vendor
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        vendorId: BigInt(vendorId),
        name: title,
      },
    });

    if (existingProduct) {
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
        minOrderQuantity: this.MIN_ORDER_QUANTITY,
        maxOrderQuantity: this.MAX_ORDER_QUANTITY,
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

    return product;
  }

  /**
   * Creates product-store mapping
   */
  private async createProductStoreMapping(
    productId: bigint,
    storeId: string,
    basePrice: number,
  ): Promise<void> {
    await this.prisma.productStoreMapping.create({
      data: {
        productId,
        storeId: BigInt(storeId),
        price: basePrice,
        stockQuantity: 0,
        isAvailable: true,
      },
    });
  }

  async createProduct(
    user: { id: string; role: string; vendorId?: string },
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { id: userId } = user;
    let vendorId: string;

    try {
      // Validate input and determine vendor
      const result = this.validateCreateProductInput(user, createProductDto);
      vendorId = result.vendorId;
      const { validatedDto } = result;
      const { storeId, title, sku, base_price } = validatedDto;

      // Log attempt
      this.logBusinessEvent(
        'product_creation_attempt',
        { userId, vendorId, productTitle: title, sku },
        vendorId,
      );

      // Validate vendor and store
      await this.validateVendorAndStore(vendorId, storeId);

      // Create product record
      const product = await this.createProductRecord(
        vendorId,
        storeId,
        validatedDto,
      );

      // Create product-store mapping
      await this.createProductStoreMapping(product.id, storeId, base_price);

      // Log success
      this.logBusinessEvent(
        'product_created',
        {
          userId,
          vendorId,
          productId: product.id.toString(),
          productTitle: title,
        },
        vendorId,
      );

      return this.mapProductResponseDto(product);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        // Log failure for business exceptions
        if (error instanceof NotFoundException) {
          const reason = error.message.includes('Vendor')
            ? 'vendor_not_found'
            : 'store_not_found_or_not_owned';
          this.logBusinessEvent(
            'product_creation_failure',
            { userId, vendorId, reason },
            userId,
          );
        } else if (error instanceof ConflictException) {
          this.logBusinessEvent(
            'product_creation_failure',
            {
              userId,
              vendorId,
              productTitle: createProductDto.title,
              reason: 'product_name_exists',
            },
            userId,
          );
        }
        throw error;
      }
      // Log unexpected errors
      this.logBusinessEvent(
        'product_creation_error',
        { userId, error: error.message },
        userId,
      );
      this.logger.error(`Product creation failed for user ${userId}:`, error);
      throw new BadRequestException('Product creation failed');
    }
  }

  async getProducts(
    user: { id: string; role: string; vendorId?: string },
    page: number = this.DEFAULT_PAGE,
    limit: number = this.DEFAULT_PAGE_LIMIT,
    category?: string,
    isActive?: boolean,
  ): Promise<{
    products: ProductResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { id: userId } = user;

    try {
      const skip = (page - 1) * limit;

      const query = this.buildRoleBasedQuery(
        {
          ...(isActive !== undefined && { isActive }),
          ...(category && { category }),
        },
        user,
      );

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
        { userId, count: products.length, page, limit },
        userId,
      );

      return {
        products: products.map((product) =>
          this.mapProductResponseDto(product),
        ),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.customLogger.logBusinessEvent(
        'products_retrieval_error',
        { userId, error: error.message },
        userId,
      );
      this.logger.error(`Products retrieval failed for user ${userId}:`, error);
      throw new BadRequestException('Failed to retrieve products');
    }
  }

  async getProductById(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
  ): Promise<ProductResponseDto> {
    const { id: userId } = user;

    try {
      const product = await this.validateProductOwnership(productId, user);

      this.customLogger.logBusinessEvent(
        'product_retrieved',
        { userId, productId },
        userId,
      );

      return this.mapProductResponseDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_retrieval_error',
        { userId, productId, error: error.message },
        userId,
      );
      this.logger.error(
        `Product retrieval failed for user ${userId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve product');
    }
  }

  async updateProduct(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const { id: userId } = user;

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

      // Validate product ownership
      const existingProduct = await this.validateProductOwnership(
        productId,
        user,
      );

      // Check if new name conflicts with existing products
      if (title && title !== existingProduct.name) {
        const nameConflict = await this.prisma.product.findFirst({
          where: {
            vendorId: existingProduct.vendorId,
            name: title,
            id: { not: BigInt(productId) },
          },
        });

        if (nameConflict) {
          throw new ConflictException(
            `Product with name '${title}' already exists for vendor ${existingProduct.vendorId}`,
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
        { userId, productId, productTitle: updatedProduct.name },
        userId,
      );

      return this.mapProductResponseDto(updatedProduct);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_update_error',
        { userId, productId, error: error.message },
        userId,
      );
      this.logger.error(
        `Product update failed for user ${userId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Product update failed');
    }
  }

  async deleteProduct(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
  ): Promise<{ message: string }> {
    const { id: userId } = user;

    try {
      // Validate product ownership
      const existingProduct = await this.validateProductOwnership(
        productId,
        user,
      );

      // Soft delete by setting isActive to false
      await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: { isActive: false },
      });

      this.customLogger.logBusinessEvent(
        'product_deleted',
        { userId, productId, productTitle: existingProduct.name },
        userId,
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
        { userId, productId, error: error.message },
        userId,
      );
      this.logger.error(
        `Product deletion failed for user ${userId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Product deletion failed');
    }
  }

  async updateProductMapping(
    user: { id: string; role: string; vendorId?: string },
    mappingId: string,
    updateProductMappingDto: UpdateProductMappingDto,
  ): Promise<ProductMappingResponseDto> {
    const { id: userId } = user;

    try {
      const { price, stock, area_pincodes, is_active } =
        updateProductMappingDto;

      // Check if mapping exists and belongs to user (through product relationship)
      const query: Record<string, any> = {
        id: BigInt(mappingId),
      };
      if (user.role === 'vendor') {
        if (!user.vendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.product = {
          vendorId: BigInt(user.vendorId),
        };
      }

      const existingMapping = await this.prisma.productStoreMapping.findFirst({
        where: query,
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
        { userId, mappingId },
        userId,
      );

      return this.mapMappingToResponseDto(existingMapping.product, mappingId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Product mapping update failed for user ${userId}, mapping ${mappingId}:`,
        error,
      );
      throw new BadRequestException('Product mapping update failed');
    }
  }

  /**
   * Validates input for image upload
   */
  private async validateUploadImagesInput(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    files: UploadedFile[],
  ): Promise<{ product: Product; normalizedFiles: UploadedFile[] }> {
    const { id: userId } = user;

    // Validate product ownership
    const product = await this.validateProductOwnership(productId, user);

    // Normalize files parameter to always be an array
    const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];

    if (normalizedFiles.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Check current image count
    const currentImageCount = product.images?.length || 0;
    const maxImages = this.MAX_PRODUCT_IMAGES;

    if (currentImageCount >= maxImages) {
      throw new BadRequestException(
        `Product already has maximum ${maxImages} images`,
      );
    }

    const availableSlots = maxImages - currentImageCount;
    if (normalizedFiles.length > availableSlots) {
      throw new BadRequestException(
        `Cannot upload ${normalizedFiles.length} images. Only ${availableSlots} slots available (current: ${currentImageCount}, max: ${maxImages})`,
      );
    }

    return { product, normalizedFiles };
  }

  /**
   * Processes and validates uploaded files
   */
  private async processAndValidateFiles(
    files: UploadedFile[],
    userId: string,
    productId: string,
  ): Promise<Array<{ buffer: Buffer; filename: string }>> {
    const fileData: Array<{ buffer: Buffer; filename: string }> = [];

    for (const file of files) {
      try {
        // Validate file structure
        if (!file || typeof file !== 'object') {
          throw new BadRequestException('Invalid file format provided');
        }

        if (!file.filename || typeof file.filename !== 'string') {
          throw new BadRequestException('Invalid filename provided');
        }

        if (!file.buffer || !(file.buffer instanceof Buffer)) {
          throw new BadRequestException(
            `Invalid buffer for file ${file.filename}`,
          );
        }

        if (file.buffer.length === 0) {
          throw new BadRequestException(
            `Empty file provided: ${file.filename}`,
          );
        }

        // Validate image using ImageProcessingService
        const validation = await this.imageProcessingService.validateImage(
          file.buffer,
        );
        if (!validation.isValid) {
          throw new BadRequestException(
            `Invalid image file ${file.filename}: ${validation.error}`,
          );
        }

        fileData.push({
          buffer: file.buffer,
          filename: file.filename,
        });
      } catch (error) {
        // Log validation errors
        this.logBusinessEvent(
          'product_image_validation_failure',
          {
            userId,
            productId,
            filename: file?.filename || 'unknown',
            error: error.message,
          },
          userId,
        );
        this.logger.error(
          `Image validation failed for file ${file?.filename || 'unknown'}:`,
          error,
        );
        throw error;
      }
    }

    return fileData;
  }

  /**
   * Uploads images to storage
   */
  private async uploadImagesToStorage(
    fileData: Array<{ buffer: Buffer; filename: string }>,
    productId: string,
  ): Promise<any[]> {
    return await this.imageProcessingService.processAndUploadMultipleImages(
      fileData,
      productId,
    );
  }

  /**
   * Updates product with new image URLs
   */
  private async updateProductImages(
    productId: string,
    existingImages: string[],
    newImageUrls: string[],
  ): Promise<string[]> {
    const updatedImages = [...existingImages, ...newImageUrls];
    await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: { images: updatedImages },
    });
    return updatedImages;
  }

  async uploadProductImages(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    files: UploadedFile[],
  ): Promise<UploadProductImagesResponseDto> {
    const { id: userId } = user;

    try {
      // Validate input
      const { product, normalizedFiles } = await this.validateUploadImagesInput(
        user,
        productId,
        files,
      );

      // Process and validate files
      const fileData = await this.processAndValidateFiles(
        normalizedFiles,
        userId,
        productId,
      );

      // Upload images
      const uploadResults = await this.uploadImagesToStorage(
        fileData,
        productId,
      );

      // Update product
      const newImageUrls = uploadResults.map((result) => result.url);
      const updatedImages = await this.updateProductImages(
        productId,
        product.images || [],
        newImageUrls,
      );

      // Prepare response
      const uploadedImages: ProductImageResponseDto[] = uploadResults.map(
        (result, index) => ({
          id: result.key,
          url: result.url,
          filename: normalizedFiles[index].filename,
          size: fileData[index].buffer.length,
          width: 800, // Processed dimensions
          height: 600,
          uploadedAt: new Date(),
        }),
      );

      const response: UploadProductImagesResponseDto = {
        productId,
        uploadedCount: uploadResults.length,
        images: uploadedImages,
        totalImages: updatedImages.length,
        uploadedAt: new Date(),
      };

      // Log success
      this.logBusinessEvent(
        'product_images_uploaded',
        {
          userId,
          productId,
          uploadedCount: uploadResults.length,
          totalImages: updatedImages.length,
        },
        userId,
      );

      return response;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // Log error
      this.logBusinessEvent(
        'product_images_upload_error',
        {
          userId,
          productId,
          error: error.message,
          errorType: error.constructor.name,
        },
        userId,
      );
      this.logger.error(
        `Product images upload failed for user ${userId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to upload product images');
    }
  }

  async deleteProductImage(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    imageId: string,
  ): Promise<{ message: string; remainingImages: number }> {
    const { id: userId } = user;

    try {
      // Validate product ownership
      const product = await this.validateProductOwnership(productId, user);

      const currentImages = product.images || [];
      const imageIndex = currentImages.findIndex((url) =>
        url.includes(imageId),
      );

      if (imageIndex === -1) {
        throw new NotFoundException('Image not found in product');
      }

      // Remove image from array
      const updatedImages = currentImages.filter(
        (_, index) => index !== imageIndex,
      );

      // Extract S3 key from the image URL for storage deletion
      const imageUrl = currentImages[imageIndex];
      let s3Key: string | null = null;

      try {
        s3Key = this.extractS3KeyFromUrl(imageUrl);
      } catch (error) {
        this.customLogger.logBusinessEvent(
          'product_image_deletion_warning',
          {
            userId,
            productId,
            imageId,
            warning:
              'Failed to extract S3 key from URL, skipping storage deletion',
            error: error.message,
          },
          userId,
        );
        this.logger.warn(
          `Failed to extract S3 key from URL ${imageUrl}, proceeding with database deletion only:`,
          error,
        );
      }

      // Update the product record first to maintain data integrity
      await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: { images: updatedImages },
      });

      // Attempt to delete from storage after database update
      if (s3Key) {
        try {
          await this.s3Service.deleteFile(s3Key);
          this.customLogger.logBusinessEvent(
            'product_image_storage_deleted',
            {
              userId,
              productId,
              imageId,
              s3Key,
            },
            userId,
          );
        } catch (storageError) {
          // Log storage deletion failure but don't fail the operation
          this.customLogger.logBusinessEvent(
            'product_image_storage_deletion_failed',
            {
              userId,
              productId,
              imageId,
              s3Key,
              error: storageError.message,
            },
            userId,
          );
          this.logger.warn(
            `Failed to delete image from storage ${s3Key}, but database updated successfully:`,
            storageError,
          );
        }
      }

      this.customLogger.logBusinessEvent(
        'product_image_deleted',
        {
          userId,
          productId,
          imageId,
          remainingImages: updatedImages.length,
          storageDeleted: s3Key !== null,
        },
        userId,
      );

      return {
        message: 'Image deleted successfully',
        remainingImages: updatedImages.length,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'product_image_deletion_error',
        { userId, productId, imageId, error: error.message },
        userId,
      );
      this.logger.error(
        `Product image deletion failed for user ${userId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to delete product image');
    }
  }

  /**
   * Validates input for image reordering
   */
  private validateReorderInput(product: Product, imageIds: string[]): void {
    const currentImages = product.images || [];

    if (imageIds.length !== currentImages.length) {
      throw new BadRequestException(
        `Image count mismatch. Provided ${imageIds.length} IDs but product has ${currentImages.length} images`,
      );
    }
  }

  /**
   * Reorders images based on provided IDs
   */
  private reorderImages(currentImages: string[], imageIds: string[]): string[] {
    const indices = new Set<number>();
    const reorderedImages: string[] = [];

    for (const id of imageIds) {
      if (!id.startsWith('image_')) {
        throw new BadRequestException(`Invalid image ID format: ${id}`);
      }

      const index = parseInt(id.split('_')[1], 10);
      if (isNaN(index) || index < 0 || index >= currentImages.length) {
        throw new BadRequestException(`Invalid image index in ID: ${id}`);
      }

      if (indices.has(index)) {
        throw new BadRequestException(`Duplicate image ID: ${id}`);
      }

      indices.add(index);
      reorderedImages.push(currentImages[index]);
    }

    if (indices.size !== currentImages.length) {
      throw new BadRequestException(
        'Not all images are included in the reorder list',
      );
    }

    return reorderedImages;
  }

  async reorderProductImages(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    imageIds: string[],
  ): Promise<{ message: string; images: ProductImageResponseDto[] }> {
    const { id: userId } = user;

    try {
      // Validate product ownership
      const product = await this.validateProductOwnership(productId, user);

      // Validate reorder input
      this.validateReorderInput(product, imageIds);

      // Reorder images
      const reorderedImages = this.reorderImages(
        product.images || [],
        imageIds,
      );

      // Update product
      await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: { images: reorderedImages },
      });

      // Prepare response
      const images: ProductImageResponseDto[] = reorderedImages.map(
        (url, index) => ({
          id: `image_${index}`,
          url,
          filename: `product-image-${index + 1}.webp`,
          size: 0,
          width: 800,
          height: 600,
          uploadedAt: new Date(),
        }),
      );

      // Log success
      this.logBusinessEvent(
        'product_images_reordered',
        { userId, productId, imageCount: images.length },
        userId,
      );

      return {
        message: 'Images reordered successfully',
        images,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // Log error
      this.logBusinessEvent(
        'product_images_reorder_error',
        { userId, productId, error: error.message },
        userId,
      );
      this.logger.error(
        `Product images reorder failed for user ${userId}, product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to reorder product images');
    }
  }

  /**
   * Extract the S3 key from a Supabase Storage URL.
   *
   * This utility method parses Supabase Storage public URLs to extract the storage key.
   * The URL format is: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{key}
   *
   * @param url - The full Supabase Storage URL
   * @returns string - The extracted storage key (e.g., 'products/123/image.webp')
   * @throws Error - When URL format is invalid
   */
  private extractS3KeyFromUrl(url: string): string {
    try {
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        throw new Error('Invalid Supabase Storage URL format');
      }

      const bucketAndKey = urlParts[1];
      const bucketEndIndex = bucketAndKey.indexOf('/');
      if (bucketEndIndex === -1) {
        throw new Error(
          'Invalid Supabase Storage URL format - missing bucket separator',
        );
      }

      // Extract everything after the bucket name
      return bucketAndKey.substring(bucketEndIndex + 1);
    } catch (error) {
      this.logger.error(`Failed to extract S3 key from URL ${url}:`, error);
      throw new Error(`Invalid image URL format: ${url}`);
    }
  }

  private mapMappingToResponseDto(
    product: Product,
    storeId: string,
  ): ProductMappingResponseDto {
    // Note: This method assumes storeMappings are included in the product query
    // In practice, you'd need to fetch the mapping separately or include it in the query
    const mapping = (product as any).storeMappings?.find(
      (m) => m.storeId === storeId,
    );
    return {
      id: `${product.id.toString()}-${storeId}`,
      product_id: product.id.toString(),
      store_id: storeId,
      product_variant_id: product.id.toString(),
      price: mapping?.price || Number(product.price),
      stock: mapping?.stockQuantity || product.stockQuantity,
      reserved_stock: mapping?.reservedStock || 0,
      area_pincodes: mapping?.areaPincodes || product.areaPincodes,
      is_active: mapping?.isAvailable || product.isAvailable,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  private mapProductResponseDto(product: Product): ProductResponseDto {
    const specs = product.specifications as any; // Cast to access properties
    return {
      id: product.id.toString(),
      vendor_id: product.vendorId.toString(),
      title: product.name,
      sku: specs?.sku || product.name.toLowerCase().replace(/\s+/g, '-'),
      description: product.description,
      category: product.category,
      attributes: {
        imageUrl: product.images,
        specifications: product.specifications,
        hasDeposit: product.hasDeposit,
        depositAmount: product.depositAmount,
      },
      base_price: Number(product.price),
      unit: product.capacity,
      is_active: product.isActive,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }
}
