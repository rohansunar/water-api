import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CustomerRole } from '../interfaces/customer.interface';
import { CustomerProfileDto } from '../../common/dto/auth.dto';
import {
  CreateAddressDto,
  UpdateAddressDto,
  AddressResponseDto,
  PaginationQueryDto,
} from '../../common/dto/customer.dto';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {}

  async findById(id: string): Promise<any | null> {
    try {
      return await this.prisma.customer.findUnique({
        where: { uuid: id },
      });
    } catch (error) {
      this.logger.error(`Error finding customer by ID ${id}:`, error);
      return null;
    }
  }

  async findByPhone(phone: string): Promise<any | null> {
    try {
      return await this.prisma.customer.findUnique({
        where: { phone },
      });
    } catch (error) {
      this.logger.error(`Error finding customer by phone ${phone}:`, error);
      return null;
    }
  }

  async create(customerData: any): Promise<any> {
    try {
      const customer = await this.prisma.customer.create({
        data: {
          phone: customerData.phone,
          name: customerData.name,
          email: customerData.email,
          walletBalance: customerData.walletBalance || 0,
          role: customerData.role || CustomerRole.CUSTOMER,
          isActive: customerData.isActive !== false,
          monthlyPaymentMode: customerData.monthlyPaymentMode || false,
        },
      });

      this.logger.log(
        `Created new customer: ${customer.uuid} with phone: ${customer.phone}`,
      );
      return customer;
    } catch (error) {
      this.logger.error('Error creating customer:', error);
      throw error;
    }
  }

  async update(id: string, updateData: any): Promise<any> {
    try {
      const updatedCustomer = await this.prisma.customer.update({
        where: { uuid: id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated customer: ${id}`);
      return updatedCustomer;
    } catch (error) {
      this.logger.error(`Error updating customer ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.customer.update({
        where: { uuid: id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Soft deleted customer: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting customer ${id}:`, error);
      throw error;
    }
  }

  async getCustomerProfile(id: string): Promise<CustomerProfileDto> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: id },
        include: {
          addresses: true,
        },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      return {
        id: customer.uuid,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        role: customer.role,
        walletBalance: Number(customer.walletBalance),
        isActive: customer.isActive,
        monthlyPaymentMode: customer.monthlyPaymentMode,
        addresses: customer.addresses.map((addr) => ({
          id: addr.id.toString(),
          type: addr.type,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          landmark: addr.landmark,
          latitude: addr.latitude ? Number(addr.latitude) : undefined,
          longitude: addr.longitude ? Number(addr.longitude) : undefined,
          isDefault: addr.isDefault,
        })),
        createdAt: customer.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error getting customer profile ${id}:`, error);
      throw error;
    }
  }

  async updateMonthlyPaymentMode(
    id: string,
    monthlyPaymentMode: boolean,
  ): Promise<any> {
    try {
      const updatedCustomer = await this.prisma.customer.update({
        where: { uuid: id },
        data: {
          monthlyPaymentMode,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Updated monthly payment mode for customer ${id}: ${monthlyPaymentMode}`,
      );
      return updatedCustomer;
    } catch (error) {
      this.logger.error(
        `Error updating monthly payment mode for customer ${id}:`,
        error,
      );
      throw error;
    }
  }

  async updateWalletBalance(
    id: string,
    amount: number,
    operation: 'add' | 'subtract' | 'set' = 'set',
  ): Promise<any> {
    try {
      const updateData: any = { updatedAt: new Date() };

      switch (operation) {
        case 'add':
          updateData.walletBalance = { increment: amount };
          break;
        case 'subtract':
          updateData.walletBalance = { decrement: amount };
          break;
        case 'set':
        default:
          updateData.walletBalance = amount;
          break;
      }

      const updatedCustomer = await this.prisma.customer.update({
        where: { uuid: id },
        data: updateData,
      });

      this.logger.log(
        `Updated wallet balance for customer ${id}: ${operation} ${amount}`,
      );
      return updatedCustomer;
    } catch (error) {
      this.logger.error(
        `Error updating wallet balance for customer ${id}:`,
        error,
      );
      throw error;
    }
  }

  // Query methods
  async findByRole(role: string): Promise<any[]> {
    try {
      return await this.prisma.customer.findMany({
        where: {
          role: role as any,
          isActive: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error finding customers by role ${role}:`, error);
      throw error;
    }
  }

  async findActiveCustomers(): Promise<any[]> {
    try {
      return await this.prisma.customer.findMany({
        where: { isActive: true },
      });
    } catch (error) {
      this.logger.error('Error finding active customers:', error);
      throw error;
    }
  }

  async searchCustomers(query: string, limit: number = 10): Promise<any[]> {
    try {
      return await this.prisma.customer.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } },
              ],
            },
          ],
        },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Error searching customers with query ${query}:`,
        error,
      );
      throw error;
    }
  }

  // Validation methods
  async validateCustomerExists(id: string): Promise<boolean> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: id },
      });
      return !!customer;
    } catch (error) {
      this.logger.error(`Error validating customer exists ${id}:`, error);
      return false;
    }
  }

  async validateCustomerActive(id: string): Promise<boolean> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: id },
      });
      return !!(customer && customer.isActive);
    } catch (error) {
      this.logger.error(`Error validating customer active ${id}:`, error);
      return false;
    }
  }

  async validateCustomerRole(id: string, role: string): Promise<boolean> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: id },
      });
      return !!(customer && customer.role === role);
    } catch (error) {
      this.logger.error(`Error validating customer role ${id}:`, error);
      return false;
    }
  }

  // Statistics
  async getCustomerStats(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    customersByRole: Record<string, number>;
    recentSignups: number;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Run queries in parallel for better performance
      const [totalCustomers, activeCustomers, roleStats, recentSignups] =
        await Promise.all([
          this.prisma.customer.count(),
          this.prisma.customer.count({ where: { isActive: true } }),
          this.prisma.customer.groupBy({
            by: ['role'],
            _count: { role: true },
          }),
          this.prisma.customer.count({
            where: { createdAt: { gte: thirtyDaysAgo } },
          }),
        ]);

      const customersByRole = roleStats.reduce((acc, stat) => {
        acc[stat.role] = stat._count.role;
        return acc;
      }, {});

      return {
        totalCustomers,
        activeCustomers,
        customersByRole,
        recentSignups,
      };
    } catch (error) {
      this.logger.error('Error getting customer stats:', error);
      throw error;
    }
  }

  // For development - seed some test data
  async seedTestData(): Promise<void> {
    try {
      const testCustomers = [
        {
          phone: '9999999999',
          name: 'Test Customer',
          role: CustomerRole.CUSTOMER,
          walletBalance: 500,
        },
        {
          phone: '8888888888',
          name: 'Test Vendor',
          role: CustomerRole.VENDOR,
          walletBalance: 1000,
        },
        {
          phone: '7777777777',
          name: 'Test Rider',
          role: CustomerRole.DELIVERY_RIDER,
          walletBalance: 200,
        },
      ];

      for (const customerData of testCustomers) {
        const existingCustomer = await this.findByPhone(customerData.phone);
        if (!existingCustomer) {
          await this.create(customerData);
        }
      }

      this.logger.log('Customer test data seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding customer test data:', error);
      throw error;
    }
  }

  // Development/Testing
  async clearTestData(): Promise<void> {
    try {
      await this.prisma.customer.deleteMany({
        where: {
          phone: {
            in: ['9999999999', '8888888888', '7777777777'],
          },
        },
      });
      this.logger.log('Customer test data cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing customer test data:', error);
      throw error;
    }
  }

  // Address Management Methods
  async getCustomerAddresses(
    customerId: string,
  ): Promise<AddressResponseDto[]> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const addresses = await this.prisma.customerAddress.findMany({
        where: { customerId: customer.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      return addresses.map((address) => ({
        id: address.id.toString(),
        type: address.type,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        latitude: address.latitude ? Number(address.latitude) : undefined,
        longitude: address.longitude ? Number(address.longitude) : undefined,
        isDefault: address.isDefault,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting addresses for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async createAddress(
    customerId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // If this is set as default, unset other default addresses
      if (createAddressDto.isDefault) {
        await this.prisma.customerAddress.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false },
        });
      }

      const address = await this.prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          type: createAddressDto.type as any,
          street: createAddressDto.street,
          landmark: createAddressDto.landmark,
          city: createAddressDto.city,
          state: createAddressDto.state,
          pincode: createAddressDto.pincode,
          latitude: createAddressDto.latitude,
          longitude: createAddressDto.longitude,
          isDefault: createAddressDto.isDefault,
        },
      });

      this.logger.log(
        `Created address ${address.id} for customer ${customerId}`,
      );
      return this.getAddressResponse(address);
    } catch (error) {
      this.logger.error(
        `Error creating address for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const addressIdBigInt = BigInt(addressId);
      const address = await this.prisma.customerAddress.findUnique({
        where: {
          id: addressIdBigInt,
          customerId: customer.id,
        },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      // If this is set as default, unset other default addresses
      if (updateAddressDto.isDefault) {
        await this.prisma.customerAddress.updateMany({
          where: {
            customerId: customer.id,
            id: { not: addressIdBigInt },
          },
          data: { isDefault: false },
        });
      }

      const updatedAddress = await this.prisma.customerAddress.update({
        where: { id: addressIdBigInt },
        data: {
          type: updateAddressDto.type as any,
          street: updateAddressDto.street,
          landmark: updateAddressDto.landmark,
          city: updateAddressDto.city,
          state: updateAddressDto.state,
          pincode: updateAddressDto.pincode,
          latitude: updateAddressDto.latitude,
          longitude: updateAddressDto.longitude,
          isDefault: updateAddressDto.isDefault,
        },
      });

      this.logger.log(
        `Updated address ${addressId} for customer ${customerId}`,
      );
      return this.getAddressResponse(updatedAddress);
    } catch (error) {
      this.logger.error(
        `Error updating address ${addressId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const addressIdBigInt = BigInt(addressId);
      const address = await this.prisma.customerAddress.findUnique({
        where: {
          id: addressIdBigInt,
          customerId: customer.id,
        },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      await this.prisma.customerAddress.delete({
        where: { id: addressIdBigInt },
      });

      this.logger.log(
        `Deleted address ${addressId} for customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting address ${addressId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async setDefaultAddress(
    customerId: string,
    addressId: string,
  ): Promise<void> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { uuid: customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const addressIdBigInt = BigInt(addressId);
      const address = await this.prisma.customerAddress.findUnique({
        where: {
          id: addressIdBigInt,
          customerId: customer.id,
        },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      // Unset all other default addresses
      await this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });

      // Set this address as default
      await this.prisma.customerAddress.update({
        where: { id: addressIdBigInt },
        data: { isDefault: true },
      });

      this.logger.log(
        `Set address ${addressId} as default for customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error setting default address ${addressId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  private getAddressResponse(address: any): AddressResponseDto {
    return {
      id: address.id.toString(),
      type: address.type,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
      latitude: address.latitude ? Number(address.latitude) : undefined,
      longitude: address.longitude ? Number(address.longitude) : undefined,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  // Order History Methods
  async getOrderHistory(
    customerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      // This would typically integrate with an Order service
      // For now, returning a mock structure
      const orders = [];
      const total = 0;

      return {
        orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Error getting order history for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async getOrderDetails(customerId: string, orderId: string): Promise<any> {
    try {
      // This would typically integrate with an Order service
      // For now, returning a mock structure
      return {};
    } catch (error) {
      this.logger.error(
        `Error getting order details ${orderId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async cancelOrder(
    customerId: string,
    orderId: string,
    reason: string,
  ): Promise<void> {
    try {
      // This would typically integrate with an Order service
      this.logger.log(
        `Cancelled order ${orderId} for customer ${customerId} with reason: ${reason}`,
      );
    } catch (error) {
      this.logger.error(
        `Error cancelling order ${orderId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async requestRefund(
    customerId: string,
    orderId: string,
    reason: string,
    description?: string,
  ): Promise<void> {
    try {
      // This would typically integrate with a Refund service
      this.logger.log(
        `Requested refund for order ${orderId} for customer ${customerId} with reason: ${reason}`,
      );
    } catch (error) {
      this.logger.error(
        `Error requesting refund for order ${orderId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  // Subscription Management Methods
  async getCustomerSubscriptions(customerId: string): Promise<any[]> {
    try {
      // This would typically integrate with a Subscription service
      // For now, returning an empty array
      return [];
    } catch (error) {
      this.logger.error(
        `Error getting subscriptions for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async createSubscription(
    customerId: string,
    subscriptionData: any,
  ): Promise<any> {
    try {
      // This would typically integrate with a Subscription service
      this.logger.log(`Created subscription for customer ${customerId}`);
      return {};
    } catch (error) {
      this.logger.error(
        `Error creating subscription for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async updateSubscription(
    customerId: string,
    subscriptionId: string,
    updateData: any,
  ): Promise<any> {
    try {
      // This would typically integrate with a Subscription service
      this.logger.log(
        `Updated subscription ${subscriptionId} for customer ${customerId}`,
      );
      return {};
    } catch (error) {
      this.logger.error(
        `Error updating subscription ${subscriptionId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async cancelSubscription(
    customerId: string,
    subscriptionId: string,
    reason: string,
  ): Promise<void> {
    try {
      // This would typically integrate with a Subscription service
      this.logger.log(
        `Cancelled subscription ${subscriptionId} for customer ${customerId} with reason: ${reason}`,
      );
    } catch (error) {
      this.logger.error(
        `Error cancelling subscription ${subscriptionId} for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  // Profile Management Methods
  async updateProfile(
    customerId: string,
    updateData: any,
  ): Promise<CustomerProfileDto> {
    try {
      await this.prisma.customer.update({
        where: { uuid: customerId },
        data: updateData,
      });

      this.logger.log(`Updated profile for customer ${customerId}`);
      return this.getCustomerProfile(customerId);
    } catch (error) {
      this.logger.error(
        `Error updating profile for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }

  async updatePreferences(customerId: string, preferences: any): Promise<void> {
    try {
      // This would typically update customer preferences in the database
      this.logger.log(`Updated preferences for customer ${customerId}`);
    } catch (error) {
      this.logger.error(
        `Error updating preferences for customer ${customerId}:`,
        error,
      );
      throw error;
    }
  }
}
