import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  ProductModerationDto,
  ApproveProductDto,
  RejectProductDto,
  BulkModerationDto,
  ProductModerationStatsDto,
  ProductModerationListQueryDto,
} from '../dto/product-moderation.dto';

enum ProductModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

@Injectable()
export class ProductModerationService {
  private readonly logger = new Logger(ProductModerationService.name);

  // Keywords that trigger auto-flagging
  private readonly flaggedKeywords = [
    'fake',
    'counterfeit',
    'illegal',
    'banned',
    'prohibited',
    'spam',
    'scam',
    'fraud',
  ];

  // Valid categories for compliance
  private readonly validCategories = [
    'water_jar',
    'water_bottle',
    'beverage',
    'accessory',
  ];

  // Price ranges for compliance (in INR)
  private readonly priceRanges = {
    water_jar: { min: 10, max: 100 },
    water_bottle: { min: 5, max: 50 },
    beverage: { min: 1, max: 20 },
    accessory: { min: 2, max: 30 },
  };

  constructor(
    private readonly customLogger: CustomLoggerService,
    private readonly prismaService: PrismaService,
  ) {}

  private safeBigIntConversion(id: string | bigint | number): bigint {
    if (typeof id === 'bigint') {
      return id;
    }
    if (typeof id === 'number') {
      return BigInt(id);
    }
    if (typeof id === 'string') {
      return BigInt(id);
    }
    throw new BadRequestException(`Invalid ID format: ${id}`);
  }

  async getProductsForModeration(
    query: ProductModerationListQueryDto,
  ): Promise<{ products: ProductModerationDto[]; total: number }> {
    try {
      const { status, vendorId, category, page = 1, limit = 20 } = query;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.moderationStatus = status;
      if (vendorId) where.vendorId = this.safeBigIntConversion(vendorId);
      if (category) where.category = category;

      const [products, total] = await Promise.all([
        this.prismaService.product.findMany({
          where,
          include: {
            vendor: {
              select: { id: true, name: true },
            },
            moderator: {
              select: { id: true, name: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.product.count({ where }),
      ]);

      const productDtos: ProductModerationDto[] = products.map((product) => ({
        id: product.id.toString(),
        vendorId: product.vendorId.toString(),
        vendorName: product.vendor.name,
        name: product.name,
        category: product.category,
        subcategory: product.subcategory || undefined,
        basePrice: Number((product as any).basePrice),
        description: product.description || undefined,
        imageUrl: (product as any).imageUrl || undefined,
        moderationStatus: product.moderationStatus,
        flaggedReason: product.flaggedReason || undefined,
        autoFlagged: product.autoFlagged,
        complianceIssues: (product.complianceIssues as any[]) || undefined,
        createdAt: product.createdAt,
        moderatedAt: product.moderatedAt || undefined,
        moderatedBy: product.moderator?.name || undefined,
      }));

      this.logger.log(
        `Retrieved ${productDtos.length} products for moderation (page ${page}, total ${total})`,
      );
      return { products: productDtos, total };
    } catch (error) {
      this.logger.error('Error retrieving products for moderation:', error);
      throw new BadRequestException(
        'Failed to retrieve products for moderation',
      );
    }
  }

  async approveProduct(
    productId: string,
    adminId: string,
    dto: ApproveProductDto,
  ): Promise<{ message: string }> {
    try {
      const product = await this.prismaService.product.findUnique({
        where: { id: this.safeBigIntConversion(productId) },
        include: { vendor: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.moderationStatus === ProductModerationStatus.APPROVED) {
        throw new BadRequestException('Product is already approved');
      }

      await this.prismaService.product.update({
        where: { id: this.safeBigIntConversion(productId) },
        data: {
          moderationStatus: ProductModerationStatus.APPROVED,
          moderatedBy: this.safeBigIntConversion(adminId),
          moderatedAt: new Date(),
          flaggedReason: null,
          complianceIssues: null,
        },
      });

      this.logger.log(`Approved product ${productId} by admin ${adminId}`);
      this.customLogger.logBusinessEvent('product_approved', {
        productId,
        adminId,
        vendorId: product.vendorId.toString(),
        productName: product.name,
        notes: dto.notes,
      });

      return { message: 'Product approved successfully' };
    } catch (error) {
      this.logger.error(`Error approving product ${productId}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to approve product');
    }
  }

  async rejectProduct(
    productId: string,
    adminId: string,
    dto: RejectProductDto,
  ): Promise<{ message: string }> {
    try {
      const product = await this.prismaService.product.findUnique({
        where: { id: this.safeBigIntConversion(productId) },
        include: { vendor: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.moderationStatus === ProductModerationStatus.REJECTED) {
        throw new BadRequestException('Product is already rejected');
      }

      await this.prismaService.product.update({
        where: { id: this.safeBigIntConversion(productId) },
        data: {
          moderationStatus: ProductModerationStatus.REJECTED,
          moderatedBy: this.safeBigIntConversion(adminId),
          moderatedAt: new Date(),
          flaggedReason: dto.reason,
        },
      });

      this.logger.log(
        `Rejected product ${productId} by admin ${adminId} with reason: ${dto.reason}`,
      );
      this.customLogger.logBusinessEvent('product_rejected', {
        productId,
        adminId,
        vendorId: product.vendorId.toString(),
        productName: product.name,
        reason: dto.reason,
        notes: dto.notes,
      });

      return { message: 'Product rejected successfully' };
    } catch (error) {
      this.logger.error(`Error rejecting product ${productId}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to reject product');
    }
  }

  async bulkModerateProducts(
    adminId: string,
    dto: BulkModerationDto,
  ): Promise<{ message: string; processed: number }> {
    try {
      const { productIds, action, reason, notes } = dto;

      if (action === 'reject' && !reason) {
        throw new BadRequestException('Reason is required for rejection');
      }

      const products = await this.prismaService.product.findMany({
        where: {
          id: { in: productIds.map((id) => this.safeBigIntConversion(id)) },
          moderationStatus: {
            notIn:
              action === 'approve'
                ? [ProductModerationStatus.APPROVED]
                : [ProductModerationStatus.REJECTED],
          },
        },
        include: { vendor: true },
      });

      if (products.length === 0) {
        return { message: 'No products to process', processed: 0 };
      }

      const updateData =
        action === 'approve'
          ? {
              moderationStatus: ProductModerationStatus.APPROVED,
              moderatedBy: this.safeBigIntConversion(adminId),
              moderatedAt: new Date(),
              flaggedReason: null,
              complianceIssues: null,
            }
          : {
              moderationStatus: ProductModerationStatus.REJECTED,
              moderatedBy: BigInt(adminId),
              moderatedAt: new Date(),
              flaggedReason: reason,
            };

      await this.prismaService.product.updateMany({
        where: { id: { in: products.map((p) => p.id) } },
        data: updateData,
      });

      // Log events for each product
      for (const product of products) {
        this.customLogger.logBusinessEvent(
          action === 'approve' ? 'product_approved' : 'product_rejected',
          {
            productId: product.id.toString(),
            adminId,
            vendorId: product.vendorId.toString(),
            productName: product.name,
            reason: action === 'reject' ? reason : undefined,
            notes,
            bulkAction: true,
          },
        );
      }

      this.logger.log(
        `Bulk ${action} processed ${products.length} products by admin ${adminId}`,
      );
      return {
        message: `Successfully ${action}d ${products.length} product(s)`,
        processed: products.length,
      };
    } catch (error) {
      this.logger.error('Error in bulk moderation:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process bulk moderation');
    }
  }

  async getModerationStats(): Promise<ProductModerationStatsDto> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        totalPending,
        totalApproved,
        totalRejected,
        totalFlagged,
        pendingToday,
        approvedToday,
        rejectedToday,
      ] = await Promise.all([
        this.prismaService.product.count({
          where: { moderationStatus: ProductModerationStatus.PENDING },
        }),
        this.prismaService.product.count({
          where: { moderationStatus: ProductModerationStatus.APPROVED },
        }),
        this.prismaService.product.count({
          where: { moderationStatus: ProductModerationStatus.REJECTED },
        }),
        this.prismaService.product.count({
          where: { moderationStatus: ProductModerationStatus.FLAGGED },
        }),
        this.prismaService.product.count({
          where: {
            moderationStatus: ProductModerationStatus.PENDING,
            createdAt: { gte: today, lt: tomorrow },
          },
        }),
        this.prismaService.product.count({
          where: {
            moderationStatus: ProductModerationStatus.APPROVED,
            moderatedAt: { gte: today, lt: tomorrow },
          },
        }),
        this.prismaService.product.count({
          where: {
            moderationStatus: ProductModerationStatus.REJECTED,
            moderatedAt: { gte: today, lt: tomorrow },
          },
        }),
      ]);

      const stats: ProductModerationStatsDto = {
        totalPending,
        totalApproved,
        totalRejected,
        totalFlagged,
        pendingToday,
        approvedToday,
        rejectedToday,
      };

      this.logger.log('Retrieved moderation statistics');
      return stats;
    } catch (error) {
      this.logger.error('Error retrieving moderation stats:', error);
      throw new BadRequestException('Failed to retrieve moderation statistics');
    }
  }

  async autoFlagProduct(productId: string): Promise<void> {
    try {
      const product = await this.prismaService.product.findUnique({
        where: { id: this.safeBigIntConversion(productId) },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const issues = this.checkCompliance(product);
      const hasIssues = issues.length > 0;

      const flaggedKeywords = this.checkForFlaggedKeywords(product);
      const shouldFlag = hasIssues || flaggedKeywords.length > 0;

      if (shouldFlag) {
        const reason =
          flaggedKeywords.length > 0
            ? `Contains flagged keywords: ${flaggedKeywords.join(', ')}`
            : 'Compliance issues detected';

        await this.prismaService.product.update({
          where: { id: this.safeBigIntConversion(productId) },
          data: {
            moderationStatus: ProductModerationStatus.FLAGGED,
            flaggedReason: reason,
            autoFlagged: true,
            complianceIssues: issues,
          },
        });

        this.logger.log(`Auto-flagged product ${productId}: ${reason}`);
        this.customLogger.logBusinessEvent('product_auto_flagged', {
          productId,
          reason,
          complianceIssues: issues,
          flaggedKeywords,
        });
      } else {
        // Set to pending for manual review
        await this.prismaService.product.update({
          where: { id: this.safeBigIntConversion(productId) },
          data: {
            moderationStatus: ProductModerationStatus.PENDING,
            autoFlagged: false,
            complianceIssues: null,
          },
        });

        this.logger.log(`Product ${productId} set to pending moderation`);
      }
    } catch (error) {
      this.logger.error(`Error auto-flagging product ${productId}:`, error);
      throw error;
    }
  }

  private checkForFlaggedKeywords(product: any): string[] {
    const text = `${product.name} ${product.description || ''}`.toLowerCase();
    return this.flaggedKeywords.filter((keyword) => text.includes(keyword));
  }

  private checkCompliance(product: any): any[] {
    const issues = [];

    // Check category validity
    if (!this.validCategories.includes(product.category)) {
      issues.push({
        type: 'invalid_category',
        message: `Category '${product.category}' is not valid`,
        validCategories: this.validCategories,
      });
    }

    // Check price range
    const priceRange = this.priceRanges[product.category];
    if (priceRange) {
      const price = Number(product.basePrice);
      if (price < priceRange.min || price > priceRange.max) {
        issues.push({
          type: 'price_out_of_range',
          message: `Price ${price} is outside valid range (${priceRange.min}-${priceRange.max}) for category ${product.category}`,
          validRange: priceRange,
        });
      }
    }

    // Check for required fields
    if (!product.name || product.name.trim().length < 3) {
      issues.push({
        type: 'invalid_name',
        message: 'Product name must be at least 3 characters long',
      });
    }

    if (!product.description || product.description.trim().length < 10) {
      issues.push({
        type: 'invalid_description',
        message: 'Product description must be at least 10 characters long',
      });
    }

    return issues;
  }
}
