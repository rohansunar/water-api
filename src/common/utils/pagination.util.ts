import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, Max, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Has previous page',
    example: false,
  })
  hasPrevPage: boolean;

  @ApiProperty({
    description: 'Has next page',
    example: true,
  })
  hasNextPage: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class PaginationUtil {
  /**
   * Calculate pagination metadata
   */
  static getPaginationMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationMetaDto {
    const totalPages = Math.ceil(total / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      total,
      page,
      limit,
      totalPages,
      hasPrevPage,
      hasNextPage,
    };
  }

  /**
   * Calculate skip value for database queries
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Build sort object for database queries
   */
  static buildSort(sort?: string, order: SortOrder = SortOrder.DESC): Record<string, 'asc' | 'desc'> {
    if (!sort) {
      return { createdAt: order };
    }

    return { [sort]: order };
  }

  /**
   * Validate and normalize pagination parameters
   */
  static normalizePagination(
    page: number = 1,
    limit: number = 20,
  ): { page: number; limit: number; skip: number } {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(100, Math.max(1, limit));

    return {
      page: normalizedPage,
      limit: normalizedLimit,
      skip: this.getSkip(normalizedPage, normalizedLimit),
    };
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    return {
      data,
      meta: this.getPaginationMeta(total, page, limit),
    };
  }
}