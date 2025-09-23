import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintService } from './complaint.service';
import { UserService } from '../modules/user/services/user.service';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('ComplaintService', () => {
  let service: ComplaintService;

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ComplaintService>(ComplaintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
