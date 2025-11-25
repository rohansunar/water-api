import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from '../../product/services/search.service';
import { Public } from '../../auth/decorators/public.decorator';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  SearchProductsQueryDto,
  SearchProductsResponseDto,
} from '../dto/customer-product-search.dto';

@ApiTags('Customer Product Search')
@Controller('customers')
export class CustomerSearchController {
  private readonly logger = new Logger(CustomerSearchController.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly customLogger: CustomLoggerService,
  ) {}

  @Get('products/search')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search products',
    description:
      'Search for products available to customers with optional filters',
  })
  @ApiQuery({ type: SearchProductsQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: SearchProductsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Database connection issues',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Database connection failed' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async searchProducts(
    @Query() queryDto: SearchProductsQueryDto,
  ): Promise<SearchProductsResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Searching products with query: ${JSON.stringify(queryDto)}`,
      );

      // Call the SearchService.searchProducts method
      const result = await this.searchService.searchProducts(queryDto);

      const duration = Date.now() - startTime;
      this.customLogger.logApiRequest(
        'GET',
        '/customers/products/search',
        HttpStatus.OK,
        duration,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle database connection issues
      if (error.code === 'P1001' || error.code === 'P2028') {
        this.logger.error(
          'Database connection error during product search:',
          error,
        );
        this.customLogger.logApiError(
          '/customers/products/search',
          'GET',
          HttpStatus.INTERNAL_SERVER_ERROR,
          error,
        );
        throw new InternalServerErrorException('Database connection failed');
      }

      // Handle other database errors
      if (error.code && error.code.startsWith('P')) {
        this.logger.error('Database error during product search:', error);
        this.customLogger.logApiError(
          '/customers/products/search',
          'GET',
          HttpStatus.INTERNAL_SERVER_ERROR,
          error,
        );
        throw new InternalServerErrorException('Failed to search products');
      }

      // Handle validation errors or other bad requests
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error('Unexpected error during product search:', error);
      this.customLogger.logApiError(
        '/customers/products/search',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
