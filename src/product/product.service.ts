import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductCategory, ProductSize } from '../common/interfaces/product.interface';
import { ProductResponseDto, CreateProductDto } from '../common/dto/product.dto';
import { VendorService } from '../vendor/vendor.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private readonly products = new Map<string, Product>();
  private readonly vendorProductIndex = new Map<string, string[]>(); // vendorId -> productIds

  constructor(private readonly vendorService: VendorService) {}

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async findByVendor(vendorId: string): Promise<Product[]> {
    const productIds = this.vendorProductIndex.get(vendorId) || [];
    return productIds.map(id => this.products.get(id)).filter(Boolean) as Product[];
  }

  async findByLocation(lat: number, lng: number): Promise<ProductResponseDto[]> {
    try {
      // Get vendors within delivery range of the location
      const nearbyVendors = await this.vendorService.findByLocation(lat, lng);
      
      const products: ProductResponseDto[] = [];
      
      for (const vendor of nearbyVendors) {
        const vendorProducts = await this.findByVendor(vendor.id);
        
        for (const product of vendorProducts) {
          if (product.isActive && product.stockQuantity > 0) {
            const productDto: ProductResponseDto = {
              id: product.id,
              vendorId: product.vendorId,
              name: product.name,
              description: product.description,
              category: product.category,
              size: product.size,
              price: product.price,
              depositAmount: product.depositAmount,
              hasDeposit: product.hasDeposit,
              stockQuantity: product.stockQuantity,
              isActive: product.isActive,
              images: product.images,
              specifications: product.specifications,
              vendor: {
                id: vendor.id,
                businessName: vendor.businessName,
                rating: vendor.rating,
                totalOrders: vendor.totalOrders,
                deliveryZones: vendor.deliveryZones.map(zone => ({
                  id: zone.id,
                  name: zone.name,
                  deliveryFee: zone.deliveryFee,
                  minOrderAmount: zone.minOrderAmount,
                  maxDeliveryTime: zone.maxDeliveryTime,
                  isActive: zone.isActive,
                })),
              },
              createdAt: product.createdAt,
              updatedAt: product.updatedAt,
            };
            products.push(productDto);
          }
        }
      }
      
      // Sort by vendor rating and product price
      products.sort((a, b) => {
        if (a.vendor.rating !== b.vendor.rating) {
          return b.vendor.rating - a.vendor.rating;
        }
        return a.price - b.price;
      });
      
      return products;
    } catch (error) {
      this.logger.error(`Error finding products by location (${lat}, ${lng}):`, error);
      throw error;
    }
  }

  async getProductDetails(productId: string): Promise<ProductResponseDto> {
    const product = await this.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const vendor = await this.vendorService.findById(product.vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found for this product');
    }

    return {
      id: product.id,
      vendorId: product.vendorId,
      name: product.name,
      description: product.description,
      category: product.category,
      size: product.size,
      price: product.price,
      depositAmount: product.depositAmount,
      hasDeposit: product.hasDeposit,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      images: product.images,
      specifications: product.specifications,
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        rating: vendor.rating,
        totalOrders: vendor.totalOrders,
        deliveryZones: vendor.deliveryZones.map(zone => ({
          id: zone.id,
          name: zone.name,
          deliveryFee: zone.deliveryFee,
          minOrderAmount: zone.minOrderAmount,
          maxDeliveryTime: zone.maxDeliveryTime,
          isActive: zone.isActive,
        })),
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async create(vendorId: string, createProductDto: CreateProductDto): Promise<Product> {
    const product: Product = {
      id: uuidv4(),
      vendorId,
      name: createProductDto.name,
      description: createProductDto.description,
      category: createProductDto.category,
      size: createProductDto.size,
      price: createProductDto.price,
      depositAmount: createProductDto.depositAmount,
      hasDeposit: createProductDto.hasDeposit,
      stockQuantity: createProductDto.stockQuantity,
      isActive: true,
      images: createProductDto.images || [],
      specifications: {
        capacity: this.getSizeCapacity(createProductDto.size),
        material: 'Plastic',
        brand: 'Generic',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(product.id, product);
    
    // Update vendor product index
    const vendorProducts = this.vendorProductIndex.get(vendorId) || [];
    vendorProducts.push(product.id);
    this.vendorProductIndex.set(vendorId, vendorProducts);
    
    this.logger.log(`Created product: ${product.id} for vendor: ${vendorId}`);
    return product;
  }

  async updateStock(productId: string, quantity: number): Promise<Product> {
    const product = this.products.get(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.stockQuantity = Math.max(0, product.stockQuantity + quantity);
    product.updatedAt = new Date();
    
    this.products.set(productId, product);
    this.logger.log(`Updated stock for product ${productId}: ${product.stockQuantity}`);
    return product;
  }

  private getSizeCapacity(size: ProductSize): number {
    switch (size) {
      case ProductSize.SMALL: return 10;
      case ProductSize.MEDIUM: return 20;
      case ProductSize.LARGE: return 25;
      case ProductSize.EXTRA_LARGE: return 30;
      default: return 20;
    }
  }

  // Seed test data
  async seedTestData(): Promise<void> {
    const vendors = await this.vendorService.getAllVendors();
    
    for (const vendor of vendors) {
      // Create 2-3 products per vendor
      const productCount = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < productCount; i++) {
        const sizes = [ProductSize.SMALL, ProductSize.MEDIUM, ProductSize.LARGE];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        
        await this.create(vendor.id, {
          name: `${size} Water Jar`,
          description: `Premium quality ${size} water jar with secure cap`,
          category: ProductCategory.WATER_JAR,
          size,
          price: this.getSizePrice(size),
          depositAmount: this.getSizeDeposit(size),
          hasDeposit: true,
          stockQuantity: Math.floor(Math.random() * 50) + 10,
          images: [`/images/jar-${size.toLowerCase()}.jpg`],
        });
      }
    }
    
    this.logger.log('Product test data seeded successfully');
  }

  private getSizePrice(size: ProductSize): number {
    switch (size) {
      case ProductSize.SMALL: return 25;
      case ProductSize.MEDIUM: return 30;
      case ProductSize.LARGE: return 35;
      case ProductSize.EXTRA_LARGE: return 40;
      default: return 30;
    }
  }

  private getSizeDeposit(size: ProductSize): number {
    switch (size) {
      case ProductSize.SMALL: return 50;
      case ProductSize.MEDIUM: return 75;
      case ProductSize.LARGE: return 100;
      case ProductSize.EXTRA_LARGE: return 125;
      default: return 75;
    }
  }
}
