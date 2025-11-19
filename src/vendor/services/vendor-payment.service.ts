import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentResponseDto } from '../dto/payment.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../dto/vendor.dto';
import { Vendor } from '../interfaces/vendor.interface';

@Injectable()
export class VendorPaymentService {
  private readonly logger = new Logger(VendorPaymentService.name);
  private readonly payments = new Map<string, PaymentResponseDto>();

  /**
   * Retrieves all payments for a vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of PaymentResponseDto.
   */
  async getPayments(
    vendor: Vendor,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    const { id } = vendor;
    const allPayments = Array.from(this.payments.values()).filter(
      (payment) => payment.vendorId === id,
    );

    const total = allPayments.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = allPayments.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Retrieves a specific payment by ID for a vendor.
   * @param vendorId - The ID of the vendor.
   * @param paymentId - The ID of the payment.
   * @returns A promise that resolves to the PaymentResponseDto.
   */
  async getPaymentById(
    vendor: Vendor,
    paymentId: string,
  ): Promise<PaymentResponseDto> {
    const { id } = vendor;
    const payment = this.payments.get(paymentId);
    if (!payment || payment.vendorId !== id) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
