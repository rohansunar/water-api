import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../../order/dto/order.dto';
import {
  OrderSummaryDto,
  AcceptOrderDto,
  RejectOrderDto,
  PaginationQueryDto,
  PaginatedResponseDto,
} from '../dto/vendor.dto';
import { Vendor } from '../interfaces/vendor.interface';

@Injectable()
export class VendorOrderService {
  private readonly logger = new Logger(VendorOrderService.name);

  constructor(private readonly vendorService: VendorService) {}

  /**
   * Retrieves all orders for the authenticated vendor.
   * @param vendorId - The ID of the vendor.
   * @returns A promise that resolves to an array of OrderResponseDto.
   */
  async getVendorOrders(vendor: Vendor): Promise<OrderResponseDto[]> {
    return this.vendorService.getVendorOrders(vendor);
  }

  /**
   * Updates the status of a specific order.
   * @param orderId - The ID of the order to update.
   * @param vendorId - The ID of the vendor.
   * @param updateOrderStatusDto - The DTO containing the new status.
   * @returns A promise that resolves to the updated OrderResponseDto.
   */
  async updateOrderStatus(
    orderId: string,
    vendor: Vendor,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.vendorService.updateOrderStatus(orderId, vendor, updateOrderStatusDto);
  }

  /**
   * Retrieves pending orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  async getPendingOrders(
    vendor: Vendor,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    return this.vendorService.getPendingOrders(vendor, paginationQuery);
  }

  /**
   * Retrieves completed orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  async getCompletedOrders(
    vendor: Vendor,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    return this.vendorService.getCompletedOrders(vendor, paginationQuery);
  }

  /**
   * Retrieves cancelled orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  async getCancelledOrders(
    vendor: Vendor,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    return this.vendorService.getCancelledOrders(vendor, paginationQuery);
  }

  /**
   * Accepts a specific order.
   * @param orderId - The ID of the order to accept.
   * @param vendorId - The ID of the vendor.
   * @param acceptOrderDto - The DTO containing acceptance details.
   * @returns A promise that resolves to the accepted OrderSummaryDto.
   */
  async acceptOrder(
    orderId: string,
    vendor: Vendor,
    acceptOrderDto: AcceptOrderDto,
  ): Promise<OrderSummaryDto> {
    return this.vendorService.acceptOrder(orderId, vendor, acceptOrderDto);
  }

  /**
   * Rejects a specific order.
   * @param orderId - The ID of the order to reject.
   * @param vendorId - The ID of the vendor.
   * @param rejectOrderDto - The DTO containing rejection details.
   * @returns A promise that resolves to a message indicating rejection.
   */
  async rejectOrder(
    orderId: string,
    vendor: Vendor,
    rejectOrderDto: RejectOrderDto,
  ): Promise<{ message: string }> {
    return this.vendorService.rejectOrder(orderId, vendor, rejectOrderDto);
  }
}