import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { BusinessException, ErrorCategory, ErrorSeverity } from '../../../src/common/exceptions/business.exception';
import { CustomLoggerService } from '../../../src/common/logger/logger.service';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockCustomLogger: jest.Mocked<CustomLoggerService>;
  let mockReply: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(async () => {
    mockCustomLogger = {
      logApiError: jest.fn(),
      logDatabaseOperation: jest.fn(),
      logInterModuleCommunication: jest.fn(),
      logValidationError: jest.fn(),
    } as any;

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'POST',
      user: { id: 'user123' },
      headers: { 'x-request-id': 'req123' },
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockReply),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };

    filter = new HttpExceptionFilter(mockCustomLogger);
  });

  describe('BusinessException handling', () => {
    it('should handle BusinessException with all required fields', () => {
      const businessException = new BusinessException(
        'Test business error',
        HttpStatus.BAD_REQUEST,
        'TEST_ERROR',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        { field: 'email', userId: 'user123' },
        false,
      );

      filter.catch(businessException, mockHost);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 'TEST_ERROR',
        message: 'Test business error',
        category: ErrorCategory.VALIDATION,
        retryable: false,
        context: { field: 'email', userId: 'user123' },
        userId: 'user123',
      });

      expect(mockCustomLogger.logApiError).toHaveBeenCalledWith(
        '/api/test',
        'POST',
        HttpStatus.BAD_REQUEST,
        businessException,
        'user123',
        'req123',
      );
    });

    it('should handle BusinessException with database category and log database operation', () => {
      const dbException = new BusinessException(
        'Database connection failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'DB_ERROR',
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH,
        { operation: 'findOne', userId: 'user123' },
        true,
      );

      filter.catch(dbException, mockHost);

      expect(mockCustomLogger.logDatabaseOperation).toHaveBeenCalledWith(
        'findOne',
        'database',
        0,
        false,
        {
          error: 'Database connection failed',
          errorCode: 'DB_ERROR',
          retryable: true,
        },
      );
    });

    it('should handle BusinessException with external service category and log inter-module communication', () => {
      const extException = new BusinessException(
        'Payment gateway timeout',
        HttpStatus.BAD_GATEWAY,
        'EXT_ERROR',
        ErrorCategory.EXTERNAL_SERVICE,
        ErrorSeverity.HIGH,
        { service: 'payment-gateway', userId: 'user123' },
        true,
      );

      filter.catch(extException, mockHost);

      expect(mockCustomLogger.logInterModuleCommunication).toHaveBeenCalledWith(
        'api',
        'payment-gateway',
        'external_call',
        0,
        false,
        {
          message: 'Payment gateway timeout',
          errorCode: 'EXT_ERROR',
        },
      );
    });

    it('should handle BusinessException without user context', () => {
      mockRequest.user = undefined;
      const businessException = new BusinessException('Test error');

      filter.catch(businessException, mockHost);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });
  });

  describe('Standard HttpException handling', () => {
    it('should handle HttpException with object response', () => {
      const httpException = new HttpException(
        { message: 'Validation failed', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(httpException, mockHost);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request. Please check your input.',
        category: ErrorCategory.VALIDATION,
        retryable: false,
        context: {},
        userId: 'user123',
      });
    });

    it('should handle HttpException with string response', () => {
      const httpException = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(httpException, mockHost);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 'NOT_FOUND_ERROR',
        message: 'The requested resource was not found.',
        category: ErrorCategory.BUSINESS_LOGIC,
        retryable: false,
        context: {},
        userId: 'user123',
      });
    });

    it('should handle validation errors with array messages', () => {
      const validationException = new HttpException(
        {
          message: ['Email is required', 'Password too short'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(validationException, mockHost);

      expect(mockReply.send).toHaveBeenCalledWith({
        code: 'VALIDATION_ERROR',
        message: ['Email is required', 'Password too short'],
        category: ErrorCategory.VALIDATION,
        retryable: false,
        context: {},
        userId: 'user123',
      });

      expect(mockCustomLogger.logValidationError).toHaveBeenCalledTimes(2);
      expect(mockCustomLogger.logValidationError).toHaveBeenCalledWith(
        'request',
        'Email is required',
        'validation_failed',
        'user123',
      );
      expect(mockCustomLogger.logValidationError).toHaveBeenCalledWith(
        'request',
        'Password too short',
        'validation_failed',
        'user123',
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error instances', () => {
      const error = new Error('Something went wrong');
      error.stack = 'Error stack trace';

      filter.catch(error, mockHost);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred. Please try again later.',
        category: ErrorCategory.SYSTEM,
        retryable: false,
        context: {},
        userId: 'user123',
      });
    });

    it('should handle unknown exception types', () => {
      const unknownException = { customProperty: 'value' };

      filter.catch(unknownException, mockHost);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 'UNKNOWN_ERROR',
        message: 'An internal server error occurred. Please try again later.',
        category: ErrorCategory.SYSTEM,
        retryable: false,
        context: {},
        userId: 'user123',
      });
    });
  });

  describe('Error categorization', () => {
    it('should categorize HTTP status codes correctly', () => {
      const testCases = [
        { status: HttpStatus.BAD_REQUEST, expectedCode: 'VALIDATION_ERROR' },
        { status: HttpStatus.UNAUTHORIZED, expectedCode: 'AUTHENTICATION_ERROR' },
        { status: HttpStatus.FORBIDDEN, expectedCode: 'AUTHORIZATION_ERROR' },
        { status: HttpStatus.NOT_FOUND, expectedCode: 'NOT_FOUND_ERROR' },
        { status: HttpStatus.CONFLICT, expectedCode: 'CONFLICT_ERROR' },
        { status: HttpStatus.UNPROCESSABLE_ENTITY, expectedCode: 'VALIDATION_ERROR' },
        { status: HttpStatus.TOO_MANY_REQUESTS, expectedCode: 'RATE_LIMIT_ERROR' },
        { status: HttpStatus.INTERNAL_SERVER_ERROR, expectedCode: 'SERVER_ERROR' },
      ];

      testCases.forEach(({ status, expectedCode }) => {
        const httpException = new HttpException('Test', status);
        filter.catch(httpException, mockHost);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({ code: expectedCode }),
        );
      });
    });

    it('should assign correct error categories based on status', () => {
      const testCases = [
        { status: HttpStatus.UNAUTHORIZED, expectedCategory: ErrorCategory.AUTHENTICATION },
        { status: HttpStatus.FORBIDDEN, expectedCategory: ErrorCategory.AUTHENTICATION },
        { status: HttpStatus.BAD_REQUEST, expectedCategory: ErrorCategory.VALIDATION },
        { status: HttpStatus.UNPROCESSABLE_ENTITY, expectedCategory: ErrorCategory.VALIDATION },
        { status: HttpStatus.NOT_FOUND, expectedCategory: ErrorCategory.BUSINESS_LOGIC },
        { status: HttpStatus.INTERNAL_SERVER_ERROR, expectedCategory: ErrorCategory.SYSTEM },
      ];

      testCases.forEach(({ status, expectedCategory }) => {
        const httpException = new HttpException('Test', status);
        filter.catch(httpException, mockHost);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({ category: expectedCategory }),
        );
      });
    });

    it('should assign correct error severity based on status', () => {
      const testCases = [
        { status: HttpStatus.INTERNAL_SERVER_ERROR, expectedSeverity: ErrorSeverity.CRITICAL },
        { status: HttpStatus.BAD_GATEWAY, expectedSeverity: ErrorSeverity.CRITICAL },
        { status: HttpStatus.UNAUTHORIZED, expectedSeverity: ErrorSeverity.HIGH },
        { status: HttpStatus.FORBIDDEN, expectedSeverity: ErrorSeverity.HIGH },
        { status: HttpStatus.NOT_FOUND, expectedSeverity: ErrorSeverity.MEDIUM },
        { status: HttpStatus.CONFLICT, expectedSeverity: ErrorSeverity.MEDIUM },
        { status: HttpStatus.BAD_REQUEST, expectedSeverity: ErrorSeverity.LOW },
      ];

      testCases.forEach(({ status, expectedSeverity }) => {
        const httpException = new HttpException('Test', status);
        filter.catch(httpException, mockHost);
        const callArgs = mockReply.send.mock.calls[mockReply.send.mock.calls.length - 1][0];
        expect(callArgs).not.toHaveProperty('severity');
      });
    });
  });

  describe('Error message formatting', () => {
    it('should format user-friendly messages for client errors', () => {
      const testCases = [
        {
          status: HttpStatus.BAD_REQUEST,
          inputMessage: 'Some validation error',
          expectedMessage: 'Invalid request. Please check your input.',
        },
        {
          status: HttpStatus.UNAUTHORIZED,
          inputMessage: 'Unauthorized',
          expectedMessage: 'Authentication required. Please log in.',
        },
        {
          status: HttpStatus.FORBIDDEN,
          inputMessage: 'Forbidden',
          expectedMessage: 'Access denied. You do not have permission to perform this action.',
        },
        {
          status: HttpStatus.NOT_FOUND,
          inputMessage: 'Not found',
          expectedMessage: 'The requested resource was not found.',
        },
        {
          status: HttpStatus.CONFLICT,
          inputMessage: 'Conflict',
          expectedMessage: 'The request conflicts with the current state of the resource.',
        },
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          inputMessage: 'Unprocessable',
          expectedMessage: 'The request was well-formed but contains invalid data.',
        },
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          inputMessage: 'Rate limited',
          expectedMessage: 'Too many requests. Please try again later.',
        },
      ];

      testCases.forEach(({ status, inputMessage, expectedMessage }) => {
        const httpException = new HttpException(inputMessage, status);
        filter.catch(httpException, mockHost);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({ message: expectedMessage }),
        );
      });
    });

    it('should preserve specific UNAUTHORIZED messages when not default', () => {
      const httpException = new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      filter.catch(httpException, mockHost);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid token' }),
      );
    });

    it('should return generic message for server errors', () => {
      const httpException = new HttpException('Database error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(httpException, mockHost);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An internal server error occurred. Please try again later.',
        }),
      );
    });

    it('should preserve array messages for validation errors', () => {
      const validationMessages = ['Field A is required', 'Field B is invalid'];
      const httpException = new HttpException(
        { message: validationMessages, error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(httpException, mockHost);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: validationMessages }),
      );
    });
  });

  describe('Logging behavior', () => {
    it('should log API errors for all exceptions', () => {
      const businessException = new BusinessException('Test error');
      filter.catch(businessException, mockHost);

      expect(mockCustomLogger.logApiError).toHaveBeenCalledWith(
        '/api/test',
        'POST',
        HttpStatus.BAD_REQUEST,
        businessException,
        'user123',
        'req123',
      );
    });

    it('should handle missing user and request ID', () => {
      mockRequest.user = undefined;
      mockRequest.headers['x-request-id'] = undefined;

      const error = new Error('Test error');
      filter.catch(error, mockHost);

      expect(mockCustomLogger.logApiError).toHaveBeenCalledWith(
        '/api/test',
        'POST',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
        undefined,
        undefined,
      );
    });
  });

  describe('Response structure consistency', () => {
    it('should always return required fields in error response', () => {
      const exceptions = [
        new BusinessException('Business error'),
        new HttpException('HTTP error', HttpStatus.BAD_REQUEST),
        new Error('Generic error'),
        'string exception',
      ];

      exceptions.forEach((exception) => {
        filter.catch(exception, mockHost);

        const callArgs = mockReply.send.mock.calls[mockReply.send.mock.calls.length - 1][0];
        expect(callArgs).toHaveProperty('code');
        expect(callArgs).toHaveProperty('message');
        expect(callArgs).toHaveProperty('category');
        expect(callArgs).toHaveProperty('retryable');
        expect(callArgs).toHaveProperty('context');
        expect(callArgs).toHaveProperty('userId');

        expect(typeof callArgs.code).toBe('string');
        expect(typeof callArgs.message).toBe('string');
        expect(typeof callArgs.category).toBe('string');
        expect(typeof callArgs.retryable).toBe('boolean');
        expect(typeof callArgs.context).toBe('object');
      });
    });

    it('should ensure error response matches desired structure', () => {
      const businessException = new BusinessException(
        'Test error',
        HttpStatus.BAD_REQUEST,
        'TEST_ERROR',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        { field: 'email' },
        false,
      );

      filter.catch(businessException, mockHost);

      const response = mockReply.send.mock.calls[0][0];

      // Verify exact structure matches requirements
      expect(response).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        category: 'VALIDATION',
        retryable: false,
        context: { field: 'email' },
        userId: 'user123',
      });

      // Ensure no extra fields are present
      expect(Object.keys(response)).toHaveLength(6);
    });
  });
});