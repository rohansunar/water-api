import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Complaint,
  ComplaintStatus,
  ComplaintType,
  ComplaintPriority,
} from '../../common/interfaces/complaint.interface';
import {
  CreateComplaintDto,
  ComplaintResponseDto,
} from '../../common/dto/complaint.dto';

@Injectable()
export class ComplaintService {
  private readonly logger = new Logger(ComplaintService.name);
  private readonly complaints = new Map<string, Complaint>();
  private readonly userComplaintIndex = new Map<string, string[]>(); // userId -> complaintIds

  constructor() {}

  async createComplaint(
    userId: string,
    createComplaintDto: CreateComplaintDto,
  ): Promise<ComplaintResponseDto> {
    try {
      // TODO: Validate user exists without UserService
      this.logger.log(`User validation needed for userId: ${userId}`);

      // Validate order exists if provided
      if (createComplaintDto.order_id) {
        // In a real implementation, this would validate the order exists and belongs to the user
        // For now, we'll just log it
        this.logger.log(
          `Complaint associated with order: ${createComplaintDto.order_id}`,
        );
      }

      // Create complaint
      const complaint: Complaint = {
        id: uuidv4(),
        userId,
        orderId: createComplaintDto.order_id,
        subscriptionId: createComplaintDto.subscription_id,
        type: createComplaintDto.type,
        subject: createComplaintDto.subject,
        message: createComplaintDto.message,
        status: ComplaintStatus.OPEN,
        priority: this.calculatePriority(createComplaintDto.type),
        attachments: createComplaintDto.attachments || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store complaint
      this.complaints.set(complaint.id, complaint);

      // Update user complaint index
      const userComplaints = this.userComplaintIndex.get(userId) || [];
      userComplaints.push(complaint.id);
      this.userComplaintIndex.set(userId, userComplaints);

      this.logger.log(
        `Created complaint ${complaint.id} for user ${userId}: ${complaint.subject}`,
      );

      return this.mapToResponseDto(complaint);
    } catch (error) {
      this.logger.error(
        `Failed to create complaint for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getUserComplaints(userId: string): Promise<ComplaintResponseDto[]> {
    try {
      // TODO: Validate user exists without UserService
      this.logger.log(`User validation needed for userId: ${userId}`);

      const complaintIds = this.userComplaintIndex.get(userId) || [];
      const complaints = complaintIds
        .map((id) => this.complaints.get(id))
        .filter(Boolean);

      // Sort by creation date (newest first)
      complaints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      this.logger.log(
        `Retrieved ${complaints.length} complaints for user ${userId}`,
      );

      return complaints.map((complaint) => this.mapToResponseDto(complaint));
    } catch (error) {
      this.logger.error(`Failed to get complaints for user ${userId}:`, error);
      throw error;
    }
  }

  async getComplaintById(
    complaintId: string,
    userId: string,
  ): Promise<ComplaintResponseDto> {
    try {
      const complaint = this.complaints.get(complaintId);
      if (!complaint) {
        throw new NotFoundException('Complaint not found');
      }

      // Verify complaint belongs to user
      if (complaint.userId !== userId) {
        throw new NotFoundException('Complaint not found');
      }

      this.logger.log(`Retrieved complaint ${complaintId} for user ${userId}`);

      return this.mapToResponseDto(complaint);
    } catch (error) {
      this.logger.error(
        `Failed to get complaint ${complaintId} for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateComplaintStatus(
    complaintId: string,
    status: ComplaintStatus,
    resolution?: string,
  ): Promise<ComplaintResponseDto> {
    try {
      const complaint = this.complaints.get(complaintId);
      if (!complaint) {
        throw new NotFoundException('Complaint not found');
      }

      // Update complaint
      complaint.status = status;
      complaint.updatedAt = new Date();

      if (resolution) {
        complaint.resolution = resolution;
      }

      if (
        status === ComplaintStatus.RESOLVED ||
        status === ComplaintStatus.CLOSED
      ) {
        complaint.resolvedAt = new Date();
      }

      this.complaints.set(complaintId, complaint);

      this.logger.log(`Updated complaint ${complaintId} status to ${status}`);

      return this.mapToResponseDto(complaint);
    } catch (error) {
      this.logger.error(`Failed to update complaint ${complaintId}:`, error);
      throw error;
    }
  }

  private calculatePriority(type: ComplaintType): ComplaintPriority {
    switch (type) {
      case ComplaintType.DELIVERY_ISSUE:
      case ComplaintType.PRODUCT_QUALITY:
        return ComplaintPriority.HIGH;
      case ComplaintType.PAYMENT_ISSUE:
      case ComplaintType.BILLING_ISSUE:
        return ComplaintPriority.MEDIUM;
      case ComplaintType.SERVICE_ISSUE:
      case ComplaintType.OTHER:
      default:
        return ComplaintPriority.LOW;
    }
  }

  private mapToResponseDto(complaint: Complaint): ComplaintResponseDto {
    return {
      id: complaint.id,
      userId: complaint.userId,
      orderId: complaint.orderId,
      subscriptionId: complaint.subscriptionId,
      type: complaint.type,
      subject: complaint.subject,
      message: complaint.message,
      status: complaint.status,
      priority: complaint.priority,
      resolution: complaint.resolution,
      attachments: complaint.attachments,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      resolvedAt: complaint.resolvedAt,
    };
  }

  // Seed test data
  async seedTestData(): Promise<void> {
    const testComplaints = [
      {
        userId: 'eda9574d-ded0-4320-8c76-ab4b12535272', // Test customer user
        order_id: 'test-order-1',
        type: ComplaintType.DELIVERY_ISSUE,
        subject: 'Late delivery',
        message:
          'My water jar delivery was 2 hours late. This caused inconvenience as I had guests coming over.',
      },
      {
        userId: 'eda9574d-ded0-4320-8c76-ab4b12535272', // Test customer user
        type: ComplaintType.PRODUCT_QUALITY,
        subject: 'Water quality issue',
        message:
          'The water jar delivered had a strange taste and smell. Please check the quality control.',
      },
    ];

    for (const complaintData of testComplaints) {
      try {
        const createDto: CreateComplaintDto = {
          order_id: complaintData.order_id,
          type: complaintData.type,
          subject: complaintData.subject,
          message: complaintData.message,
        };

        await this.createComplaint(complaintData.userId, createDto);
      } catch (error) {
        // Ignore errors during seeding (user might not exist yet)
        this.logger.warn(
          `Failed to seed complaint for user ${complaintData.userId}:`,
          error.message,
        );
      }
    }

    this.logger.log('Complaint test data seeded successfully');
  }
}
