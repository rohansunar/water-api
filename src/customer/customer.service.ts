import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomerRole } from '../common/interfaces/customer.interface';
import { CustomerProfileDto } from '../common/dto/auth.dto';
import { CustomLoggerService } from '../common/logger/logger.service';
import { Customer, CustomerDocument } from '../common/schemas/customer.schema';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
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
      const [totalCustomers, activeCustomers, roleStats, recentSignups] = await Promise.all([
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
}
