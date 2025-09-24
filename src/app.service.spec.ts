import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return the welcome message', () => {
      const result = service.getHello();
      expect(result).toBe('Water Jar Delivery API - Ready to serve! 💧');
    });

    it('should return a string', () => {
      const result = service.getHello();
      expect(typeof result).toBe('string');
    });

    it('should return a non-empty string', () => {
      const result = service.getHello();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});