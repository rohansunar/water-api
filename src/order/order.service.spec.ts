import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { UserService } from '../modules/user/services/user.service';
import { ProductService } from '../product/product.service';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('OrderService', () => {
  let service: OrderService;

  const mockUserService = {
    findById: jest.fn(),
    updateWalletBalance: jest.fn(),
  };

  const mockProductService = {
    findById: jest.fn(),
    updateStock: jest.fn(),
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
        OrderService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
