import { Test, TestingModule } from '@nestjs/testing';
import { CustomLoggerService } from './logger.service';

describe('CustomLoggerService', () => {
  let service: CustomLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomLoggerService],
    }).compile();

    service = module.get<CustomLoggerService>(CustomLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should log info message with context', () => {
      const logSpy = jest.spyOn(service['logger'], 'info');
      service.log('Test message', 'TestContext');
      expect(logSpy).toHaveBeenCalledWith('Test message', { context: 'TestContext' });
    });
  });

  describe('error', () => {
    it('should log error message with stack and context', () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      service.error('Error message', 'Stack trace', 'ErrorContext');
      expect(errorSpy).toHaveBeenCalledWith('Error message', { 
        context: 'ErrorContext', 
        stack: 'Stack trace' 
      });
    });
  });

  describe('logHttpRequest', () => {
    it('should log HTTP request with proper format', () => {
      const infoSpy = jest.spyOn(service['logger'], 'info');
      service.logHttpRequest('GET', '/api/test', 200, 150, 'Mozilla/5.0');
      
      expect(infoSpy).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        type: 'http_request',
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        responseTime: 150,
        userAgent: 'Mozilla/5.0',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('logApiError', () => {
    it('should log API error with proper format', () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const testError = new Error('Test error');
      testError.name = 'TestError';
      
      service.logApiError('/api/test', 'POST', 400, testError, 'user123', 'req456');
      
      expect(errorSpy).toHaveBeenCalledWith('API Error', expect.objectContaining({
        type: 'api_error',
        endpoint: '/api/test',
        method: 'POST',
        statusCode: 400,
        userId: 'user123',
        requestId: 'req456',
        error: {
          message: 'Test error',
          stack: expect.any(String),
          name: 'TestError',
        },
        timestamp: expect.any(String),
      }));
    });
  });

  describe('logValidationError', () => {
    it('should log validation error with proper format', () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      
      service.logValidationError('email', 'invalid-email', 'isEmail', 'user123');
      
      expect(warnSpy).toHaveBeenCalledWith('Validation Error', expect.objectContaining({
        type: 'validation_error',
        field: 'email',
        value: 'invalid-email',
        constraint: 'isEmail',
        userId: 'user123',
        timestamp: expect.any(String),
      }));
    });

    it('should stringify object values', () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      const objectValue = { test: 'value' };
      
      service.logValidationError('data', objectValue, 'isValid');
      
      expect(warnSpy).toHaveBeenCalledWith('Validation Error', expect.objectContaining({
        value: JSON.stringify(objectValue),
      }));
    });
  });

  describe('logDatabaseOperation', () => {
    it('should log successful database operation', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      
      service.logDatabaseOperation('find', 'users', 50, true);
      
      expect(logSpy).toHaveBeenCalledWith('info', 'Database Operation', expect.objectContaining({
        type: 'database_operation',
        operation: 'find',
        collection: 'users',
        duration: 50,
        success: true,
        error: undefined,
        timestamp: expect.any(String),
      }));
    });

    it('should log failed database operation with error', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const dbError = new Error('Connection failed');
      dbError['code'] = 'ECONNREFUSED';
      
      service.logDatabaseOperation('insert', 'orders', 100, false, dbError);
      
      expect(logSpy).toHaveBeenCalledWith('error', 'Database Operation', expect.objectContaining({
        type: 'database_operation',
        operation: 'insert',
        collection: 'orders',
        duration: 100,
        success: false,
        error: {
          message: 'Connection failed',
          stack: expect.any(String),
          code: 'ECONNREFUSED',
        },
        timestamp: expect.any(String),
      }));
    });
  });

  describe('logBusinessEvent', () => {
    it('should log business event with proper format', () => {
      const infoSpy = jest.spyOn(service['logger'], 'info');
      const eventData = { orderId: 'order123', amount: 100 };
      
      service.logBusinessEvent('order_created', eventData, 'user123');
      
      expect(infoSpy).toHaveBeenCalledWith('Business Event', expect.objectContaining({
        type: 'business_event',
        event: 'order_created',
        data: eventData,
        userId: 'user123',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with proper format', () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      const details = { attempts: 3, blocked: true };
      
      service.logSecurityEvent('failed_login', details, '192.168.1.1', 'Mozilla/5.0');
      
      expect(warnSpy).toHaveBeenCalledWith('Security Event', expect.objectContaining({
        type: 'security_event',
        event: 'failed_login',
        details,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('logPerformance', () => {
    it('should log performance metric with proper format', () => {
      const infoSpy = jest.spyOn(service['logger'], 'info');
      const metadata = { cacheHit: true, queryCount: 2 };
      
      service.logPerformance('database_query', 250, metadata);
      
      expect(infoSpy).toHaveBeenCalledWith('Performance Metric', expect.objectContaining({
        type: 'performance',
        operation: 'database_query',
        duration: 250,
        metadata,
        timestamp: expect.any(String),
      }));
    });
  });
});
