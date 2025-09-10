import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { CustomLoggerService } from '../logger/logger.service';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockCustomLogger: jest.Mocked<CustomLoggerService>;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(async () => {
    mockCustomLogger = {
      logApiError: jest.fn(),
      logValidationError: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpExceptionFilter,
        {
          provide: CustomLoggerService,
          useValue: mockCustomLogger,
        },
      ],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {},
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException correctly', () => {
      const exception = new BadRequestException('Invalid input');
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid request. Please check your input.',
          path: '/api/test',
          method: 'GET',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle validation errors with array messages', () => {
      const validationException = new BadRequestException(['Field is required', 'Invalid format']);
      mockRequest.user = { id: 'user123' };
      
      filter.catch(validationException, mockHost);

      expect(mockCustomLogger.logValidationError).toHaveBeenCalledTimes(2);
      expect(mockCustomLogger.logValidationError).toHaveBeenCalledWith(
        'request',
        'Field is required',
        'validation_failed',
        'user123'
      );
      expect(mockCustomLogger.logValidationError).toHaveBeenCalledWith(
        'request',
        'Invalid format',
        'validation_failed',
        'user123'
      );
    });

    it('should handle UnauthorizedException with user-friendly message', () => {
      const exception = new UnauthorizedException('Token expired');
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Authentication required. Please log in.',
        })
      );
    });

    it('should handle generic Error with 500 status', () => {
      const exception = new Error('Database connection failed');
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred. Please try again later.',
        })
      );
    });

    it('should handle unknown exception', () => {
      const exception = 'Unknown error';
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred. Please try again later.',
        })
      );
    });

    it('should include request ID when available', () => {
      mockRequest.headers['x-request-id'] = 'req-123';
      const exception = new BadRequestException('Test error');
      
      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123',
        })
      );
    });

    it('should log API errors with custom logger', () => {
      const exception = new BadRequestException('Test error');
      mockRequest.user = { id: 'user123' };
      mockRequest.headers['x-request-id'] = 'req-456';
      
      filter.catch(exception, mockHost);

      expect(mockCustomLogger.logApiError).toHaveBeenCalledWith(
        '/api/test',
        'GET',
        400,
        exception,
        'user123',
        'req-456'
      );
    });
  });

  describe('formatErrorMessage', () => {
    it('should return validation errors as array for 400 status', () => {
      const messages = ['Field 1 error', 'Field 2 error'];
      const result = filter['formatErrorMessage'](messages, HttpStatus.BAD_REQUEST);
      expect(result).toEqual(messages);
    });

    it('should return user-friendly message for 404 status', () => {
      const result = filter['formatErrorMessage']('Not found', HttpStatus.NOT_FOUND);
      expect(result).toBe('The requested resource was not found.');
    });

    it('should return generic message for 500 status', () => {
      const result = filter['formatErrorMessage']('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result).toBe('An internal server error occurred. Please try again later.');
    });

    it('should return original message for unknown status codes', () => {
      const originalMessage = 'Custom error';
      const result = filter['formatErrorMessage'](originalMessage, 299);
      expect(result).toBe(originalMessage);
    });
  });
});
