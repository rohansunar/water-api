import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VendorPaymentService } from '../services/vendor-payment.service';
import { VendorJwtAuthGuard } from '../guards/vendor-jwt-auth.guard';
import { CurrentVendor } from '../decorators/current-vendor.decorator';
import { PaginationQueryDto, PaginatedResponseDto } from '../dto/vendor.dto';
import { PaymentResponseDto } from '../dto/payment.dto';
import { Vendor } from '../interfaces/vendor.interface';

@ApiTags('Vendor Payments')
@Controller('vendors/me/payments')
@UseGuards(VendorJwtAuthGuard)
export class VendorPaymentController {
  private readonly logger = new Logger(VendorPaymentController.name);

  constructor(private readonly vendorPaymentService: VendorPaymentService) {}

  /**
   * Retrieves all payments for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of PaymentResponseDto.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all payments',
    description:
      'Retrieve all payments for the authenticated vendor with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PaymentResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getPayments(
    @CurrentVendor() vendor: Vendor,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    try {
      this.logger.log(`Getting payments for vendor: ${vendor.id}`);
      return await this.vendorPaymentService.getPayments(
        vendor,
        paginationQuery,
      );
    } catch (error) {
      this.logger.error(`Error getting payments for vendor ${vendor.id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a specific payment by ID.
   * @param paymentId - The ID of the payment.
   * @param vendorId - The ID of the vendor.
   * @returns A promise that resolves to the PaymentResponseDto.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get payment by ID',
    description:
      'Retrieve a specific payment by its ID for the authenticated vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async getPaymentById(
    @Param('id') paymentId: string,
    @CurrentVendor() vendor: Vendor,
  ): Promise<PaymentResponseDto> {
    try {
      this.logger.log(`Getting payment ${paymentId} for vendor: ${vendor.id}`);
      return await this.vendorPaymentService.getPaymentById(vendor, paymentId);
    } catch (error) {
      this.logger.error(
        `Error getting payment ${paymentId} for vendor ${vendor.id}:`,
        error,
      );
      throw error;
    }
  }
}
