import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { UserService } from '../modules/user/services/user.service';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('WalletService', () => {
  let service: WalletService;

  const mockUserService = {
    findById: jest.fn(),
    updateWalletBalance: jest.fn(),
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
        WalletService,
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

    service = module.get<WalletService>(WalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
