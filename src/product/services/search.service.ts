import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

// Additional interfaces for better type safety
export interface ProductSearchQuery {
  query?: string;
  pincode?: string;
  category?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
