import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintController } from '../../src/complaint/complaint.controller';
import { ComplaintService } from '../../src/complaint/complaint.service';
import { CreateComplaintDto } from '../../src/common/dto/complaint.dto';
import { CustomerRole } from '../../src/common/interfaces/user.interface';

describe('ComplaintController', () => {
  let controller: ComplaintController;
  let complaintService: any;

  const mockUser = {
    id: 'user-id',
    phone: '+1234567890',
    name: 'Test User',
    email: 'user@example.com',
    addresses: [],
    walletBalance: 100,
    role: CustomerRole.CUSTOMER,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    complaintService = {
      createComplaint: jest.fn(),
      getUserComplaints: jest.fn(),
      getComplaintById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplaintController],
      providers: [
        {
          provide: ComplaintService,
          useValue: complaintService,
        },
      ],
    }).compile();

    controller = module.get<ComplaintController>(ComplaintController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComplaint', () => {
    it('should create a complaint successfully', async () => {
      const createComplaintDto: CreateComplaintDto = {
        subject: 'Late delivery',
        message: 'Order was delivered 2 hours late',
        order_id: 'order-123',
        type: 'delivery_issue' as any,
      };

      const expectedResult = {
        id: 'complaint-id',
        subject: 'Late delivery',
        status: 'open',
        createdAt: new Date(),
      };

      complaintService.createComplaint.mockResolvedValue(expectedResult);

      const result = await controller.createComplaint(mockUser, createComplaintDto);

      expect(complaintService.createComplaint).toHaveBeenCalledWith('user-id', createComplaintDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getUserComplaints', () => {
    it('should return user complaints', async () => {
      const complaints = [
        {
          id: 'complaint-1',
          subject: 'Late delivery',
          status: 'open',
          createdAt: new Date(),
        },
        {
          id: 'complaint-2',
          subject: 'Wrong item',
          status: 'resolved',
          createdAt: new Date(),
        },
      ];

      complaintService.getUserComplaints.mockResolvedValue(complaints);

      const result = await controller.getUserComplaints(mockUser);

      expect(complaintService.getUserComplaints).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(complaints);
    });
  });

  describe('getComplaintById', () => {
    it('should return complaint by id', async () => {
      const complaint = {
        id: 'complaint-1',
        subject: 'Late delivery',
        description: 'Order was delivered 2 hours late',
        status: 'open',
        createdAt: new Date(),
      };

      complaintService.getComplaintById.mockResolvedValue(complaint);

      const result = await controller.getComplaintById('complaint-1', mockUser);

      expect(complaintService.getComplaintById).toHaveBeenCalledWith('complaint-1', 'user-id');
      expect(result).toEqual(complaint);
    });
  });
});