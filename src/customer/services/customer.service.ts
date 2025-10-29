import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomerRole } from '../../common/interfaces/customer.interface';
import { CustomerProfileDto } from '../../common/dto/auth.dto';
import {
  CreateAddressDto,
  UpdateAddressDto,
  AddressResponseDto,
  PaginationQueryDto,
} from '../../common/dto/customer.dto';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { Customer, CustomerDocument } from '../../common/schemas/customer.schema';
import { Address, AddressDocument } from '../../common/schemas/address.schema';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    private readonly logger: CustomLoggerService,
  ) {}

  async findById(id: string): Promise<CustomerDocument | null> {
    try {
      return await this.customerModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding customer by ID ${id}:`, error);
      return null;
    }
  }

  async findByPhone(phone: string): Promise<CustomerDocument | null> {
    try {
      return await this.customerModel.findOne({ phone }).exec();
    } catch (error) {
      this.logger.error(`Error finding customer by phone ${phone}:`, error);
      return null;
    }
  }

  async create(customerData: Partial<Customer>): Promise<CustomerDocument> {
    try {
      const customer = await this.customerModel.create({
        phone: customerData.phone,
        name: customerData.name,
        email: customerData.email,
        addresses: customerData.addresses || [],
        walletBalance: customerData.walletBalance || 0,
        role: customerData.role || CustomerRole.CUSTOMER,
        isActive: customerData.isActive !== false,
        monthlyPaymentMode: customerData.monthlyPaymentMode || false,
      });

      this.logger.log(
        `Created new customer: ${customer._id} with phone: ${customer.phone}`,
      );
      return customer;
    } catch (error) {
      this.logger.error('Error creating customer:', error);
      throw error;
    }
  }

  async update(
    id: string,
    updateData: Partial<Customer>,
  ): Promise<CustomerDocument> {
    try {
      const updatedCustomer = await this.customerModel
        .findByIdAndUpdate(
          id,
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedCustomer) {
        throw new NotFoundException('Customer not found');
      }

      this.logger.log(`Updated customer: ${id}`);
      return updatedCustomer;
    } catch (error) {
      this.logger.error(`Error updating customer ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.customerModel
        .findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() })
        .exec();

      if (!result) {
        throw new NotFoundException('Customer not found');
      }

      this.logger.log(`Soft deleted customer: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting customer ${id}:`, error);
      throw error;
    }
  }

  async getCustomerProfile(id: string): Promise<CustomerProfileDto> {
    try {
      const customer = await this.customerModel
        .findById(id)
        .populate('addresses')
        .exec();
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      return {
        id: customer._id.toString(),
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        role: customer.role,
        walletBalance: customer.walletBalance,
        isActive: customer.isActive,
        monthlyPaymentMode: customer.monthlyPaymentMode,
        addresses: customer.addresses.map((addr: any) => ({
          id: addr._id.toString(),
          type: addr.type,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          landmark: addr.landmark,
          latitude: addr.latitude,
          longitude: addr.longitude,
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
  ): Promise<CustomerDocument> {
    try {
      const updatedCustomer = await this.customerModel
        .findByIdAndUpdate(
          id,
          { monthlyPaymentMode, updatedAt: new Date() },
          { new: true },
        )
        .exec();

      if (!updatedCustomer) {
        throw new NotFoundException('Customer not found');
      }

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
  ): Promise<CustomerDocument> {
    try {
      const updateQuery: any = { updatedAt: new Date() };

      switch (operation) {
        case 'add':
          updateQuery.$inc = { walletBalance: amount };
          break;
        case 'subtract':
          updateQuery.$inc = { walletBalance: -amount };
          break;
        case 'set':
        default:
          updateQuery.walletBalance = amount;
          break;
      }

      const updatedCustomer = await this.customerModel
        .findByIdAndUpdate(id, updateQuery, { new: true })
        .exec();

      if (!updatedCustomer) {
        throw new NotFoundException('Customer not found');
      }

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
  async findByRole(role: string): Promise<CustomerDocument[]> {
    try {
      return await this.customerModel.find({ role, isActive: true }).exec();
    } catch (error) {
      this.logger.error(`Error finding customers by role ${role}:`, error);
      throw error;
    }
  }

  async findActiveCustomers(): Promise<CustomerDocument[]> {
    try {
      return await this.customerModel.find({ isActive: true }).exec();
    } catch (error) {
      this.logger.error('Error finding active customers:', error);
      throw error;
    }
  }

  async searchCustomers(
    query: string,
    limit: number = 10,
  ): Promise<CustomerDocument[]> {
    try {
      return await this.customerModel
        .find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } },
          ],
          isActive: true,
        })
        .limit(limit)
        .exec();
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
      const customer = await this.customerModel.findById(id).exec();
      return !!customer;
    } catch (error) {
      this.logger.error(`Error validating customer exists ${id}:`, error);
      return false;
    }
  }

  async validateCustomerActive(id: string): Promise<boolean> {
    try {
      const customer = await this.customerModel.findById(id).exec();
      return !!(customer && customer.isActive);
    } catch (error) {
      this.logger.error(`Error validating customer active ${id}:`, error);
      return false;
    }
  }

  async validateCustomerRole(id: string, role: string): Promise<boolean> {
    try {
      const customer = await this.customerModel.findById(id).exec();
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
          this.customerModel.countDocuments().exec(),
          this.customerModel.countDocuments({ isActive: true }).exec(),
          this.customerModel
            .aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
            .exec(),
          this.customerModel
            .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
            .exec(),
        ]);

      const customersByRole = roleStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
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
      await this.customerModel.deleteMany({
        phone: { $in: ['9999999999', '8888888888', '7777777777'] },
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
      const customer = await this.customerModel.findById(customerId).exec();
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const addresses = await this.addressModel
        .find({ customerId })
        .sort({ isDefault: -1, createdAt: -1 })
        .exec();

      return addresses.map((address) => ({
        id: address._id.toString(),
        type: address.type,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        latitude: address.latitude,
        longitude: address.longitude,
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
      const customer = await this.customerModel.findById(customerId).exec();
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // If this is set as default, unset other default addresses
      if (createAddressDto.isDefault) {
        await this.addressModel.updateMany(
          { customerId },
          { isDefault: false },
        );
      }

      const address = await this.addressModel.create({
        customerId,
        ...createAddressDto,
      });

      // Add address to customer's address list
      await this.customerModel.findByIdAndUpdate(customerId, {
        $push: { addresses: address._id },
      });

      this.logger.log(
        `Created address ${address._id} for customer ${customerId}`,
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
      const address = await this.addressModel.findOne({
        _id: addressId,
        customerId,
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      // If this is set as default, unset other default addresses
      if (updateAddressDto.isDefault) {
        await this.addressModel.updateMany(
          { customerId, _id: { $ne: addressId } },
          { isDefault: false },
        );
      }

      const updatedAddress = await this.addressModel
        .findByIdAndUpdate(addressId, updateAddressDto, { new: true })
        .exec();

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
      const address = await this.addressModel.findOne({
        _id: addressId,
        customerId,
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      await this.addressModel.findByIdAndDelete(addressId);

      // Remove address from customer's address list
      await this.customerModel.findByIdAndUpdate(customerId, {
        $pull: { addresses: addressId },
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
      const address = await this.addressModel.findOne({
        _id: addressId,
        customerId,
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      // Unset all other default addresses
      await this.addressModel.updateMany({ customerId }, { isDefault: false });

      // Set this address as default
      await this.addressModel.findByIdAndUpdate(addressId, { isDefault: true });

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

  private getAddressResponse(address: AddressDocument): AddressResponseDto {
    return {
      id: address._id.toString(),
      type: address.type,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
      latitude: address.latitude,
      longitude: address.longitude,
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
      const customer = await this.customerModel
        .findByIdAndUpdate(customerId, updateData, { new: true })
        .populate('addresses')
        .exec();

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

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
