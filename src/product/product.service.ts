import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { ProductResponseDto, CreateProductDto } from '../common/dto/product.dto';
import { Product } from '@prisma/client';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    try {
      return await this.prisma.product.findUnique({
        where: { id },
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
      this.logger.error(`Error finding products by category ${category}:`, error);
      throw error;
    }
  }

  async getProductDetails(productId: string): Promise<ProductResponseDto> {
    const product = await this.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const p = product as any;
    return {
      id: p.id,
      vendorId: p.vendorId,
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      imageUrl: p.imageUrl,
      isAvailable: p.isAvailable,
      isActive: p.isActive,
      stockQuantity: p.stockQuantity,
      hasDeposit: p.hasDeposit,
      depositAmount: p.depositAmount,
      size: p.size,
      images: p.images,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async create(createProductDto: CreateProductDto, vendorId?: string): Promise<Product> {
    try {
      const product = await this.prisma.product.create({
        data: {
          vendorId: vendorId || 'default-vendor-id', // TODO: Get from context
          name: createProductDto.name,
          description: createProductDto.description,
          price: createProductDto.price,
          category: createProductDto.category,
          imageUrl: createProductDto.imageUrl,
          isAvailable: true,
          isActive: true,
          stockQuantity: createProductDto.stockQuantity || 0,
          hasDeposit: createProductDto.hasDeposit || false,
          depositAmount: createProductDto.depositAmount || 0,
          size: createProductDto.size,
          images: createProductDto.images || [],
        } as any,
      });

      this.logger.log(`Created product: ${product.id}`);
      return product;
    } catch (error) {
      this.logger.error('Error creating product:', error);
      throw error;
    }
  }

  async update(id: string, updateData: Partial<Product>): Promise<Product> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
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

      const newStock = (product as any).stockQuantity + quantityChange;
      if (newStock < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: { stockQuantity: newStock } as any,
      });

      this.logger.log(`Updated stock for product ${id}: ${quantityChange}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating stock for product ${id}:`, error);
      throw error;
    }
  }

  async findByLocation(lat: number, lng: number): Promise<Product[]> {
    // In real implementation, calculate distance from vendor location
    // For now, return all available products
    return this.findAll();
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.product.delete({
        where: { id },
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
          category: 'Water Jar',
          imageUrl: '/images/jar-20l.jpg',
        },
        {
          name: '15L Water Jar',
          description: 'Compact 15L water jar perfect for small families',
          price: 25,
          category: 'Water Jar',
          imageUrl: '/images/jar-15l.jpg',
        },
        {
          name: '25L Water Jar',
          description: 'Large capacity 25L water jar for big families',
          price: 35,
          category: 'Water Jar',
          imageUrl: '/images/jar-25l.jpg',
        },
        {
          name: '10L Water Bottle',
          description: 'Portable 10L water bottle for office use',
          price: 20,
          category: 'Water Bottle',
          imageUrl: '/images/bottle-10l.jpg',
        },
      ];

      for (const productData of testProducts) {
        const existingProduct = await this.prisma.product.findFirst({
          where: { name: productData.name },
        });

        if (!existingProduct) {
          await this.create(productData);
        }
      }

      this.logger.log('Product test data seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding product test data:', error);
      throw error;
    }
  }
}
