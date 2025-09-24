import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductResponseDto, CreateProductDto } from '../common/dto/product.dto';
import { Product, ProductDocument } from '../common/schemas/product.schema';
import { CustomLoggerService } from '../common/logger/logger.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly logger: CustomLoggerService,
  ) {}

  async findById(id: string): Promise<ProductDocument | null> {
    try {
      return await this.productModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding product by ID ${id}:`, error);
      return null;
    }
  }

  async findAll(): Promise<ProductDocument[]> {
    try {
      return await this.productModel.find({ isAvailable: true }).sort({ createdAt: -1 }).exec();
    } catch (error) {
      this.logger.error('Error finding all products:', error);
      throw error;
    }
  }

  async findByCategory(category: string): Promise<ProductDocument[]> {
    try {
      return await this.productModel.find({
        category,
        isAvailable: true,
      }).sort({ price: 1 }).exec();
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

    return {
      id: (product as any).id,
      vendorId: (product.vendorId as any).toString(),
      name: product.name,
      description: product.description,
      category: product.category,
      size: product.capacity,
      price: product.price,
      depositAmount: 0, // Not in schema, default to 0
      hasDeposit: false, // Not in schema, default to false
      stockQuantity: product.stock,
      isActive: product.isAvailable,
      images: product.images,
      specifications: {
        capacity: parseInt(product.capacity.replace('L', '')),
        material: product.specifications?.material || 'Plastic',
        brand: product.specifications?.brand || 'Generic',
        weight: product.specifications?.weight || 1.5,
        dimensions: {
          height: product.specifications?.dimensions?.height || 50,
          diameter: product.specifications?.dimensions?.length || product.specifications?.dimensions?.width || 30,
        },
      },
      vendor: {
        id: (product.vendorId as any).toString(),
        businessName: 'Default Vendor',
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async create(createProductDto: CreateProductDto, vendorId?: string): Promise<ProductDocument> {
    try {
      const product = await this.productModel.create({
        vendorId: vendorId || 'default-vendor-id', // TODO: Get from context
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
        status: 'active',
      });

      this.logger.log(`Created product: ${product.id}`);
      return product;
    } catch (error) {
      this.logger.error('Error creating product:', error);
      throw error;
    }
  }

  async update(id: string, updateData: Partial<ProductDocument>): Promise<ProductDocument> {
    try {
      const product = await this.productModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      this.logger.log(`Updated product: ${id}`);
      return product;
    } catch (error) {
      this.logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  async updateStock(id: string, quantityChange: number): Promise<ProductDocument> {
    try {
      const product = await this.findById(id);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const newStock = product.stock + quantityChange;
      if (newStock < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        id,
        { stock: newStock },
        { new: true }
      );

      if (!updatedProduct) {
        throw new NotFoundException('Product not found');
      }

      this.logger.log(`Updated stock for product ${id}: ${quantityChange}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating stock for product ${id}:`, error);
      throw error;
    }
  }

  async findByLocation(lat: number, lng: number): Promise<ProductResponseDto[]> {
    // In real implementation, calculate distance from vendor location
    // For now, return all available products
    const products = await this.findAll();
    return products.map(product => ({
      id: (product as any).id,
      vendorId: (product.vendorId as any).toString(),
      name: product.name,
      description: product.description,
      category: product.category,
      size: product.capacity,
      price: product.price,
      depositAmount: 0, // Not in schema, default to 0
      hasDeposit: false, // Not in schema, default to false
      stockQuantity: product.stock,
      isActive: product.isAvailable,
      images: product.images,
      specifications: {
        capacity: parseInt(product.capacity.replace('L', '')),
        material: product.specifications?.material || 'Plastic',
        brand: product.specifications?.brand || 'Generic',
        weight: product.specifications?.weight || 1.5,
        dimensions: {
          height: product.specifications?.dimensions?.height || 50,
          diameter: product.specifications?.dimensions?.length || product.specifications?.dimensions?.width || 30,
        },
      },
      vendor: {
        id: (product.vendorId as any).toString(),
        businessName: 'Default Vendor',
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }

  async searchProducts(searchDto: any): Promise<any> {
    try {
      const { query, pincode, category, page = 1, limit = 20 } = searchDto;
      const skip = (page - 1) * limit;

      // Build search query
      const searchQuery: any = { isAvailable: true };

      if (query) {
        searchQuery.$or = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ];
      }

      if (category) {
        searchQuery.category = category;
      }

      // For now, we'll ignore pincode filtering as vendor location logic needs to be implemented
      // In a real implementation, you'd join with vendor/store data and filter by delivery zones

      const total = await this.productModel.countDocuments(searchQuery).exec();
      const products = await this.productModel
        .find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();

      const totalPages = Math.ceil(total / limit);

      // Transform to search result format
      const searchResults = products.map(product => ({
        id: (product as any).id,
        name: product.name,
        category: product.category,
        subcategory: product.capacity, // Using capacity as subcategory
        price: product.price,
        store: {
          id: (product.vendorId as any).toString(),
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
      await this.productModel.findByIdAndDelete(id).exec();
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
          category: 'water_jar' as any,
          size: '20L' as any,
          stockQuantity: 100,
          images: ['/images/jar-20l.jpg'],
        },
        {
          name: '15L Water Jar',
          description: 'Compact 15L water jar perfect for small families',
          price: 25,
          category: 'water_jar' as any,
          size: '15L' as any,
          stockQuantity: 150,
          images: ['/images/jar-15l.jpg'],
        },
        {
          name: '25L Water Jar',
          description: 'Large capacity 25L water jar for big families',
          price: 35,
          category: 'water_jar' as any,
          size: '25L' as any,
          stockQuantity: 80,
          images: ['/images/jar-25l.jpg'],
        },
        {
          name: '10L Water Bottle',
          description: 'Portable 10L water bottle for office use',
          price: 20,
          category: 'water_jar' as any,
          size: '10L' as any,
          stockQuantity: 200,
          images: ['/images/bottle-10l.jpg'],
        },
      ];

      for (const productData of testProducts) {
        const existingProduct = await this.productModel.findOne({
          name: productData.name,
        }).exec();

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
}
