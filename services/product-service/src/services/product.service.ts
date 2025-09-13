import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { 
  CreateProductDto, 
  UpdateProductDto, 
  UpdateStockDto,
  ProductSearchDto,
  ProductResponseDto 
} from '../dto/product.dto';
import { ProductSearchResult } from '../interfaces/product.interface';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    try {
      const product = new this.productModel({
        ...createProductDto,
        isActive: true,
        isAvailable: true,
        rating: 0,
        reviewCount: 0,
      });

      const savedProduct = await product.save();
      this.logger.log(`Created new product: ${savedProduct._id} - ${savedProduct.name}`);
      return savedProduct;
    } catch (error) {
      this.logger.error('Error creating product:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<ProductDocument | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      return await this.productModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding product by ID ${id}:`, error);
      return null;
    }
  }

  async findByVendor(vendorId: string): Promise<ProductDocument[]> {
    try {
      return await this.productModel
        .find({ vendorId, isActive: true })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding products for vendor ${vendorId}:`, error);
      return [];
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductDocument> {
    try {
      const updatedProduct = await this.productModel
        .findByIdAndUpdate(
          id,
          { ...updateProductDto, updatedAt: new Date() },
          { new: true, runValidators: true }
        )
        .exec();

      if (!updatedProduct) {
        throw new NotFoundException('Product not found');
      }

      this.logger.log(`Updated product: ${id}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  async updateStock(id: string, updateStockDto: UpdateStockDto): Promise<ProductDocument> {
    try {
      const product = await this.productModel.findById(id).exec();
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const operation = updateStockDto.operation || 'add';
      let newStock: number;

      switch (operation) {
        case 'add':
          newStock = product.stockQuantity + updateStockDto.quantity;
          break;
        case 'subtract':
          newStock = product.stockQuantity - updateStockDto.quantity;
          break;
        case 'set':
          newStock = updateStockDto.quantity;
          break;
        default:
          throw new BadRequestException('Invalid stock operation');
      }

      if (newStock < 0) {
        throw new BadRequestException('Stock quantity cannot be negative');
      }

      product.stockQuantity = newStock;
      product.updatedAt = new Date();

      // Update availability based on stock
      product.isAvailable = newStock > 0;

      const updatedProduct = await product.save();
      this.logger.log(`Updated stock for product ${id}: ${updatedProduct.stockQuantity}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating stock for product ${id}:`, error);
      throw error;
    }
  }

  async search(searchDto: ProductSearchDto): Promise<ProductSearchResult> {
    try {
      const {
        search,
        category,
        vendorId,
        minPrice,
        maxPrice,
        isActive = true,
        isAvailable,
        hasDeposit,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = searchDto;

      // Build filter query
      const filter: any = { isActive };

      if (search) {
        filter.$text = { $search: search };
      }

      if (category) {
        filter.category = category;
      }

      if (vendorId) {
        filter.vendorId = vendorId;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined) filter.price.$gte = minPrice;
        if (maxPrice !== undefined) filter.price.$lte = maxPrice;
      }

      if (isAvailable !== undefined) {
        filter.isAvailable = isAvailable;
      }

      if (hasDeposit !== undefined) {
        filter.hasDeposit = hasDeposit;
      }

      // Build sort query
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Add text score sorting if searching
      if (search) {
        sort.score = { $meta: 'textScore' };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries
      const [products, total] = await Promise.all([
        this.productModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productModel.countDocuments(filter).exec(),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Search completed: ${products.length} products found`);

      return {
        products: products.map(product => this.mapToResponseDto(product)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Error searching products:', error);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const categories = await this.productModel
        .distinct('category', { isActive: true })
        .exec();
      return categories.sort();
    } catch (error) {
      this.logger.error('Error getting categories:', error);
      return [];
    }
  }

  async getFeaturedProducts(limit: number = 10): Promise<ProductResponseDto[]> {
    try {
      const products = await this.productModel
        .find({ isActive: true, isAvailable: true })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limit)
        .exec();

      return products.map(product => this.mapToResponseDto(product));
    } catch (error) {
      this.logger.error('Error getting featured products:', error);
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.productModel
        .findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() })
        .exec();

      if (!result) {
        throw new NotFoundException('Product not found');
      }

      this.logger.log(`Deleted product: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  async updateRating(id: string, rating: number, reviewCount: number): Promise<ProductDocument> {
    try {
      const updatedProduct = await this.productModel
        .findByIdAndUpdate(
          id,
          { rating, reviewCount, updatedAt: new Date() },
          { new: true, runValidators: true }
        )
        .exec();

      if (!updatedProduct) {
        throw new NotFoundException('Product not found');
      }

      this.logger.log(`Updated rating for product ${id}: ${rating} (${reviewCount} reviews)`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating rating for product ${id}:`, error);
      throw error;
    }
  }

  private mapToResponseDto(product: ProductDocument): ProductResponseDto {
    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      unit: product.unit,
      capacity: product.capacity,
      stockQuantity: product.stockQuantity,
      vendorId: product.vendorId,
      hasDeposit: product.hasDeposit,
      depositAmount: product.depositAmount,
      images: product.images,
      isActive: product.isActive,
      isAvailable: product.isAvailable,
      orderLimits: product.orderLimits,
      specifications: product.specifications,
      tags: product.tags,
      rating: product.rating,
      reviewCount: product.reviewCount,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  // For development - seed some test data
  async seedTestData(): Promise<void> {
    try {
      const testProducts = [
        {
          name: '20L Water Jar',
          description: 'Premium quality 20-liter water jar with deposit',
          price: 50,
          category: 'Water Jars',
          unit: 'jar',
          capacity: 20,
          stockQuantity: 100,
          vendorId: 'vendor1',
          hasDeposit: true,
          depositAmount: 200,
          tags: ['premium', 'large', 'deposit'],
        },
        {
          name: '1L Water Bottle',
          description: 'Convenient 1-liter water bottle for daily use',
          price: 20,
          category: 'Water Bottles',
          unit: 'bottle',
          capacity: 1,
          stockQuantity: 500,
          vendorId: 'vendor1',
          hasDeposit: false,
          depositAmount: 0,
          tags: ['convenient', 'daily-use'],
        },
        {
          name: '5L Water Can',
          description: 'Medium-sized 5-liter water can for small families',
          price: 35,
          category: 'Water Cans',
          unit: 'can',
          capacity: 5,
          stockQuantity: 200,
          vendorId: 'vendor2',
          hasDeposit: false,
          depositAmount: 0,
          tags: ['family', 'medium'],
        },
      ];

      for (const productData of testProducts) {
        const existingProduct = await this.productModel
          .findOne({ name: productData.name, vendorId: productData.vendorId })
          .exec();
        
        if (!existingProduct) {
          await this.create(productData as CreateProductDto);
        }
      }

      this.logger.log('Test product data seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding test product data:', error);
      throw error;
    }
  }
}
