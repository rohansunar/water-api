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
  CreateCustomerProductDto,
  UpdateProductDto,
  UpdateProductMappingDto,
  ProductResponseDto,
  ProductMappingResponseDto,
  UploadProductImagesResponseDto,
  ProductImageResponseDto,
} from '../dto/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private readonly DEFAULT_PAGE_LIMIT = 10;
  private readonly DEFAULT_PAGE = 1;
  private readonly MAX_PRODUCT_IMAGES = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly customLogger: CustomLoggerService,
    private readonly productModerationService: ProductModerationService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly s3Service: S3Service,
  ) {}

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

  async findAll(): Promise<Product[]> {
    try {
      return await this.prisma.product.findMany({
        where: { isAvailable: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding all products:', error);
      throw error;
    }
  }

  async findByCategory(category: string): Promise<Product[]> {
    try {
      return await this.prisma.product.findMany({
        where: {
          category,
          isAvailable: true,
        },
        orderBy: { price: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding products by category ${category}:`,
        error,
      );
      throw error;
    }
  }

  async getProductDetails(productId: string): Promise<ProductResponseDto> {
    const product = await this.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.mapToProductResponseDto(product);
  }

  async create(
    createProductDto: CreateCustomerProductDto,
    vendorId?: string,
  ): Promise<Product> {
    try {
      const product = await this.prisma.product.create({
        data: {
          vendorId: BigInt(vendorId || '1'), // TODO: Get from context
          name: createProductDto.name,
          description: createProductDto.description,
          price: createProductDto.price,
          category: createProductDto.category,
          capacity: createProductDto.size,
          unit: 'jar', // Default unit
          stock: createProductDto.stockQuantity || 0,
          isAvailable: true,
          minOrderQuantity: 1,
          maxOrderQuantity: 1000,
          areaPincodes: [],
          images: createProductDto.images || [],
          specifications: {
            material: 'Plastic',
            brand: 'Generic',
            weight: 1.5,
          },
          moderationStatus: 'PENDING',
        },
      });

      this.logger.log(`Created product: ${product.id}`);

      // Trigger auto-moderation for the new product
      try {
        await this.productModerationService.autoFlagProduct(
          product.id.toString(),
        );
      } catch (error) {
        this.logger.error(`Failed to auto-flag product ${product.id}:`, error);
        // Don't fail the product creation if moderation fails
      }

      return product;
    } catch (error) {
      this.logger.error('Error creating product:', error);
      throw error;
    }
  }

  async update(id: string, updateData: Partial<Product>): Promise<Product> {
    try {
      const product = await this.prisma.product.update({
        where: { id: BigInt(id) },
        data: updateData,
      });

      this.logger.log(`Updated product: ${id}`);
      return product;
    } catch (error) {
      this.logger.error(`Error updating product ${id}:`, error);
      throw error;
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

  async findByLocation(
    lat: number,
    lng: number,
  ): Promise<ProductResponseDto[]> {
    // In real implementation, calculate distance from vendor location
    // For now, return all available products
    const products = await this.findAll();
    return products.map((product) => this.mapToProductResponseDto(product));
  }

  async searchProducts(searchDto: any): Promise<any> {
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

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.product.delete({
        where: { id: BigInt(id) },
      });
      this.logger.log(`Deleted product: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  // Seed test data
  async seedTestData(): Promise<void> {
    try {
      const testProducts = [
        {
          name: '20L Water Jar',
          description: 'Premium quality 20L water jar with secure cap',
          price: 30,
          category: 'water_jar',
          size: '20L',
          stockQuantity: 100,
          images: ['/images/jar-20l.jpg'],
        },
        {
          name: '15L Water Jar',
          description: 'Compact 15L water jar perfect for small families',
          price: 25,
          category: 'water_jar',
          size: '15L',
          stockQuantity: 150,
          images: ['/images/jar-15l.jpg'],
        },
        {
          name: '25L Water Jar',
          description: 'Large capacity 25L water jar for big families',
          price: 35,
          category: 'water_jar',
          size: '25L',
          stockQuantity: 80,
          images: ['/images/jar-25l.jpg'],
        },
        {
          name: '10L Water Bottle',
          description: 'Portable 10L water bottle for office use',
          price: 20,
          category: 'water_jar',
          size: '10L',
          stockQuantity: 200,
          images: ['/images/bottle-10l.jpg'],
        },
      ];

      for (const productData of testProducts) {
        const existingProduct = await this.prisma.product.findFirst({
          where: { name: productData.name },
        });

        if (!existingProduct) {
          await this.create(productData as any);
        }
      }

      this.logger.log('Product test data seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding product test data:', error);
      throw error;
    }
  }

  async createProduct(
    user: { id: string; role: string; vendorId?: string },
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { id: userId, role, vendorId: userVendorId } = user;
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

      // Determine vendorId based on role
      let vendorId: string;
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        vendorId = userVendorId;
      } else if (role === 'admin') {
        // For admin, vendorId could be passed in dto or default
        // For now, assume admin creates for themselves or specified
        // TODO: Add vendorId to dto for admin
        vendorId = userId; // or from dto
      } else {
        throw new BadRequestException('Invalid user role');
      }

      // Log product creation attempt
      this.customLogger.logBusinessEvent(
        'product_creation_attempt',
        { userId, vendorId, productTitle: title, sku },
        vendorId,
      );

      // Check if vendor exists and is active
      const vendorRecord = await this.prisma.vendor.findFirst({
        where: { id: BigInt(vendorId) },
      });
      if (!vendorRecord) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { userId, vendorId, reason: 'vendor_not_found' },
          vendorId,
        );
        throw new NotFoundException('Vendor not found');
      }

      if (!vendorRecord.isActive) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { userId, vendorId, reason: 'vendor_not_active' },
          vendorId,
        );
        throw new BadRequestException('Vendor is not active');
      }

      // Check if store exists and belongs to vendor
      const storeRecord = await this.prisma.store.findFirst({
        where: { id: BigInt(storeId), vendorId: BigInt(vendorId) },
      });
      if (!storeRecord || storeRecord.vendorId !== BigInt(vendorId)) {
        this.customLogger.logBusinessEvent(
          'product_creation_failure',
          { userId, vendorId, storeId, reason: 'store_not_found_or_not_owned' },
          vendorId,
        );
        throw new NotFoundException(
          'Store not found or does not belong to vendor',
        );
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
          { userId, vendorId, productTitle: title, reason: 'product_name_exists' },
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
        { userId, vendorId, productId: product.id.toString(), productTitle: title },
        vendorId,
      );

      return this.mapProductToVendorResponseDto(product);
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
    const { id: userId, role, vendorId: userVendorId } = user;
    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;

      const query: any = {
        ...(isActive !== undefined && { isActive }),
        ...(category && { category }),
      };

      // Add role-based filter
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.vendorId = BigInt(userVendorId);
      }
      // For admin, no additional filter

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
          this.mapProductToVendorResponseDto(product),
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
    const { id: userId, role, vendorId: userVendorId } = user;
    const startTime = Date.now();
    try {
      const query: any = { id: BigInt(productId) };

      // Add role-based filter
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.vendorId = BigInt(userVendorId);
      }

      const product = await this.prisma.product.findFirst({
        where: query,
      });

      if (!product) {
        this.customLogger.logBusinessEvent(
          'product_retrieval_failure',
          { userId, productId, reason: 'product_not_found' },
          userId,
        );
        throw new NotFoundException('Product not found');
      }

      this.customLogger.logBusinessEvent(
        'product_retrieved',
        { userId, productId },
        userId,
      );

      return this.mapProductToVendorResponseDto(product);
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
    const { id: userId, role, vendorId: userVendorId } = user;
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

      // Check if product exists and belongs to user (based on role)
      const query: any = { id: BigInt(productId) };
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.vendorId = BigInt(userVendorId);
      }

      const existingProduct = await this.prisma.product.findFirst({
        where: query,
      });

      if (!existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_update_failure',
          { userId, productId, reason: 'product_not_found' },
          userId,
        );
        throw new NotFoundException('Product not found');
      }

      // Check if new name conflicts with existing products
      if (title && title !== existingProduct.name) {
        const nameConflictQuery: any = {
          vendorId: existingProduct.vendorId,
          name: title,
          id: { not: BigInt(productId) },
        };
        if (role === 'vendor') {
          nameConflictQuery.vendorId = BigInt(userVendorId);
        }

        const nameConflict = await this.prisma.product.findFirst({
          where: nameConflictQuery,
        });

        if (nameConflict) {
          this.customLogger.logBusinessEvent(
            'product_update_failure',
            { userId, productId, reason: 'name_conflict' },
            userId,
          );
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

      return this.mapProductToVendorResponseDto(updatedProduct);
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

  async deleteProduct(user: { id: string; role: string; vendorId?: string }, productId: string): Promise<any> {
    const { id: userId, role, vendorId: userVendorId } = user;
    const startTime = Date.now();
    try {
      // Check if product exists and belongs to user (based on role)
      const query: any = { id: BigInt(productId) };
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.vendorId = BigInt(userVendorId);
      }

      const existingProduct = await this.prisma.product.findFirst({
        where: query,
      });

      if (!existingProduct) {
        this.customLogger.logBusinessEvent(
          'product_deletion_failure',
          { userId, productId, reason: 'product_not_found' },
          userId,
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
    const { id: userId, role, vendorId: userVendorId } = user;
    const startTime = Date.now();
    try {
      const { price, stock, area_pincodes, is_active } =
        updateProductMappingDto;

      // Check if mapping exists and belongs to user (through product relationship)
      const query: any = {
        id: BigInt(mappingId),
      };
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.product = {
          vendorId: BigInt(userVendorId),
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

  async uploadProductImages(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    files: any[],
  ): Promise<UploadProductImagesResponseDto> {
    const { id: userId, role, vendorId: userVendorId } = user;
    const startTime = Date.now();

    // Normalize files parameter to always be an array
    const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];

    try {
      // Check if product exists and belongs to user
      const query: any = { id: BigInt(productId) };
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.vendorId = BigInt(userVendorId);
      }

      const product = await this.prisma.product.findFirst({
        where: query,
      });

      if (!product) {
        this.customLogger.logBusinessEvent(
          'product_images_upload_failure',
          { userId, productId, reason: 'product_not_found' },
          userId,
        );
        throw new NotFoundException('Product not found');
      }

      // Check current image count
      const currentImageCount = product.images?.length || 0;
      const maxImages = this.MAX_PRODUCT_IMAGES;

      if (currentImageCount >= maxImages) {
        throw new BadRequestException(
          `Product already has maximum ${maxImages} images`,
        );
      }

      if (normalizedFiles.length === 0) {
        throw new BadRequestException('No files provided');
      }

      const availableSlots = maxImages - currentImageCount;
      if (normalizedFiles.length > availableSlots) {
        throw new BadRequestException(
          `Cannot upload ${normalizedFiles.length} images. Only ${availableSlots} slots available (current: ${currentImageCount}, max: ${maxImages})`,
        );
      }

      // Validate and prepare image files
      const fileData: Array<{ buffer: Buffer; filename: string }> = [];

      for (const file of normalizedFiles) {
        try {
          // Validate file structure
          if (!file || typeof file !== 'object') {
            throw new BadRequestException('Invalid file format provided');
          }

          if (!file.filename || typeof file.filename !== 'string') {
            throw new BadRequestException('Invalid filename provided');
          }

          if (!file.buffer || !(file.buffer instanceof Buffer)) {
            throw new BadRequestException(`Invalid buffer for file ${file.filename}`);
          }

          if (file.buffer.length === 0) {
            throw new BadRequestException(`Empty file provided: ${file.filename}`);
          }

          // Validate image using ImageProcessingService
          const validation = await this.imageProcessingService.validateImage(file.buffer);
          if (!validation.isValid) {
            throw new BadRequestException(`Invalid image file ${file.filename}: ${validation.error}`);
          }

          fileData.push({
            buffer: file.buffer,
            filename: file.filename,
          });
        } catch (error) {
          // Log validation errors for debugging
          this.customLogger.logBusinessEvent(
            'product_image_validation_failure',
            {
              userId,
              productId,
              filename: file?.filename || 'unknown',
              error: error.message,
            },
            userId,
          );
          this.logger.error(`Image validation failed for file ${file?.filename || 'unknown'}:`, error);
          throw error; // Re-throw to stop processing
        }
      }

      // Process and upload images
      const uploadResults =
        await this.imageProcessingService.processAndUploadMultipleImages(
          fileData,
          productId,
        );

      // Update product with new image URLs
      const newImageUrls = uploadResults.map((result) => result.url);
      const updatedImages = [...(product.images || []), ...newImageUrls];

      await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: { images: updatedImages },
      });

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

      this.customLogger.logBusinessEvent(
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
      this.customLogger.logBusinessEvent(
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
    const { id: userId, role, vendorId: userVendorId } = user;

    try {
      // Check if product exists and belongs to user
      const query: any = { id: BigInt(productId) };
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.vendorId = BigInt(userVendorId);
      }

      const product = await this.prisma.product.findFirst({
        where: query,
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

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
            warning: 'Failed to extract S3 key from URL, skipping storage deletion',
            error: error.message,
          },
          userId,
        );
        this.logger.warn(`Failed to extract S3 key from URL ${imageUrl}, proceeding with database deletion only:`, error);
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
          this.logger.warn(`Failed to delete image from storage ${s3Key}, but database updated successfully:`, storageError);
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

  async reorderProductImages(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    imageIds: string[],
  ): Promise<{ message: string; images: ProductImageResponseDto[] }> {
    const { id: userId, role, vendorId: userVendorId } = user;

    try {
      // Check if product exists and belongs to user
      const query: any = { id: BigInt(productId) };
      if (role === 'vendor') {
        if (!userVendorId) {
          throw new BadRequestException('Vendor ID not found for user');
        }
        query.vendorId = BigInt(userVendorId);
      }

      const product = await this.prisma.product.findFirst({
        where: query,
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const currentImages = product.images || [];

      if (imageIds.length !== currentImages.length) {
        throw new BadRequestException(
          `Image count mismatch. Provided ${imageIds.length} IDs but product has ${currentImages.length} images`,
        );
      }

      // Validate and reorder images based on provided IDs
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
        throw new BadRequestException('Not all images are included in the reorder list');
      }

      await this.prisma.product.update({
        where: { id: BigInt(productId) },
        data: { images: reorderedImages },
      });

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

      this.customLogger.logBusinessEvent(
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
      this.customLogger.logBusinessEvent(
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
        throw new Error('Invalid Supabase Storage URL format - missing bucket separator');
      }

      // Extract everything after the bucket name
      return bucketAndKey.substring(bucketEndIndex + 1);
    } catch (error) {
      this.logger.error(`Failed to extract S3 key from URL ${url}:`, error);
      throw new Error(`Invalid image URL format: ${url}`);
    }
  }

  private mapMappingToResponseDto(
    product: any,
    storeId: string,
  ): ProductMappingResponseDto {
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

  private mapToProductResponseDto(product: Product): ProductResponseDto {
    return {
      id: product.id.toString(),
      vendor_id: product.vendorId.toString(),
      title: product.name,
      sku: product.name.toLowerCase().replace(/\s+/g, '-'),
      description: product.description,
      category: product.category,
      attributes: {
        size: product.capacity,
        depositAmount: product.depositAmount,
        hasDeposit: product.hasDeposit,
        stockQuantity: product.stock,
      },
      base_price: Number(product.price),
      unit: 'piece',
      is_active: product.isAvailable,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  private mapProductToVendorResponseDto(product: any): ProductResponseDto {
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
        imageUrl: product.images,
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
}
