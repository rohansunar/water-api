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

@Injectable()
export class VendorOrderService {
  private readonly logger = new Logger(VendorOrderService.name);

  constructor(private readonly vendorService: VendorService) {}

  /**
   * Retrieves all orders for the authenticated vendor.
   * @param vendorId - The ID of the vendor.
   * @returns A promise that resolves to an array of OrderResponseDto.
   */
  async getVendorOrders(vendorId: string): Promise<OrderResponseDto[]> {
    return this.vendorService.getVendorOrders(vendorId);
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
    vendorId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.vendorService.updateOrderStatus(orderId, vendorId, updateOrderStatusDto);
  }

  /**
   * Retrieves pending orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  async getPendingOrders(
    vendorId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    return this.vendorService.getPendingOrders(vendorId, paginationQuery);
  }

  /**
   * Retrieves completed orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  async getCompletedOrders(
    vendorId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    return this.vendorService.getCompletedOrders(vendorId, paginationQuery);
  }

  /**
   * Retrieves cancelled orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  async getCancelledOrders(
    vendorId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    return this.vendorService.getCancelledOrders(vendorId, paginationQuery);
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
    vendorId: string,
    acceptOrderDto: AcceptOrderDto,
  ): Promise<OrderSummaryDto> {
    return this.vendorService.acceptOrder(orderId, vendorId, acceptOrderDto);
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
    vendorId: string,
    rejectOrderDto: RejectOrderDto,
  ): Promise<{ message: string }> {
    return this.vendorService.rejectOrder(orderId, vendorId, rejectOrderDto);
  }
}