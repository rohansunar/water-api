import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConflictException } from '../../common/exceptions/business.exception';
import { ProductResponseDto, CreateProductDto } from '../dto/product.dto';
import { Product } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { ProductModerationService } from './product-moderation.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly productModerationService: ProductModerationService,
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
    createProductDto: CreateProductDto,
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

  async update(
    id: string,
    updateData: Partial<Product>,
  ): Promise<Product> {
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

  async updateStock(
    id: string,
    quantityChange: number,
  ): Promise<Product> {
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

  private mapToProductResponseDto(
    product: Product,
  ): ProductResponseDto {
    return {
      id: product.id.toString(),
      vendorId: product.vendorId.toString(),
      name: product.name,
      description: product.description,
      category: product.category,
      size: product.capacity,
      price: Number(product.price),
      depositAmount: Number(product.depositAmount),
      hasDeposit: product.hasDeposit,
      stockQuantity: product.stock,
      isActive: product.isAvailable,
      images: product.images,
      specifications: {
        capacity: parseInt(product.capacity.replace('L', '')),
        material: (product.specifications as any)?.material || 'Plastic',
        brand: (product.specifications as any)?.brand || 'Generic',
        weight: (product.specifications as any)?.weight || 1.5,
        dimensions: {
          height: (product.specifications as any)?.dimensions?.height || 50,
          diameter:
            (product.specifications as any)?.dimensions?.length ||
            (product.specifications as any)?.dimensions?.width ||
            30,
        },
      },
      vendor: {
        id: product.vendorId.toString(),
        businessName: 'Default Vendor',
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
