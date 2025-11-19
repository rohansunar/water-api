import { HttpStatus } from '@nestjs/common';
import {
  BusinessException,
  ValidationException,
  InvalidInputException,
  MissingRequiredFieldException,
  AuthenticationException,
  InvalidCredentialsException,
  TokenExpiredException,
  InvalidTokenException,
  AuthorizationException,
  InsufficientPermissionsException,
  ResourceAccessDeniedException,
  InsufficientFundsException,
  OrderNotFoundException,
  InvalidOrderStatusException,
  ProductOutOfStockException,
  DeliveryZoneNotSupportedException,
  InvalidSubscriptionException,
  WalletTransactionException,
  DatabaseException,
  RecordNotFoundException,
  DuplicateRecordException,
  DatabaseConnectionException,
  ExternalServiceException,
  PaymentServiceException,
  NotificationServiceException,
  ConfigurationException,
  RateLimitException,
  CircuitBreakerException,
  ConflictException,
  ErrorCategory,
  ErrorSeverity,
} from '../../../src/common/exceptions/business.exception';

describe('BusinessException', () => {
  describe('BusinessException base class', () => {
    it('should create a BusinessException with default values', () => {
      const exception = new BusinessException('Test error');

      expect(exception.message).toBe('Test error');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('GENERIC_ERROR');
      expect(exception.category).toBe(ErrorCategory.BUSINESS_LOGIC);
      expect(exception.severity).toBe(ErrorSeverity.MEDIUM);
      expect(exception.retryable).toBe(false);
      expect(exception.timestamp).toBeInstanceOf(Date);
      expect(exception.name).toBe('BusinessException[GENERIC_ERROR]');
    });

    it('should create a BusinessException with custom values', () => {
      const context = { userId: '123', field: 'email' };
      const exception = new BusinessException(
        'Custom error',
        HttpStatus.NOT_FOUND,
        'CUSTOM_ERROR',
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH,
        context,
        true,
      );

      expect(exception.message).toBe('Custom error');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('CUSTOM_ERROR');
      expect(exception.category).toBe(ErrorCategory.DATABASE);
      expect(exception.severity).toBe(ErrorSeverity.HIGH);
      expect(exception.context).toEqual(context);
      expect(exception.retryable).toBe(true);
      expect(exception.name).toBe('BusinessException[CUSTOM_ERROR]');
    });

    it('should return structured error response', () => {
      const context = { userId: '123' };
      const exception = new BusinessException(
        'Test error',
        HttpStatus.BAD_REQUEST,
        'TEST_ERROR',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        context,
        false,
      );

      const response = exception.getErrorResponse();

      expect(response).toEqual({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          timestamp: exception.timestamp.toISOString(),
          retryable: false,
          context,
        },
      });
    });
  });

  describe('Validation Exceptions', () => {
    it('should create ValidationException', () => {
      const exception = new ValidationException(
        'Invalid email format',
        'email',
      );

      expect(exception.message).toBe('Invalid email format');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('VALIDATION_ERROR');
      expect(exception.category).toBe(ErrorCategory.VALIDATION);
      expect(exception.severity).toBe(ErrorSeverity.LOW);
      expect(exception.context).toEqual({ field: 'email' });
      expect(exception.retryable).toBe(false);
    });

    it('should create InvalidInputException', () => {
      const exception = new InvalidInputException('Invalid input', 'phone');

      expect(exception.message).toBe('Invalid input');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('INVALID_INPUT');
      expect(exception.category).toBe(ErrorCategory.VALIDATION);
      expect(exception.context).toEqual({ field: 'phone' });
    });

    it('should create MissingRequiredFieldException', () => {
      const exception = new MissingRequiredFieldException('name');

      expect(exception.message).toBe("Required field 'name' is missing");
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('MISSING_REQUIRED_FIELD');
      expect(exception.context).toEqual({ field: 'name' });
    });
  });

  describe('Authentication Exceptions', () => {
    it('should create AuthenticationException', () => {
      const exception = new AuthenticationException('Custom auth error');

      expect(exception.message).toBe('Custom auth error');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.errorCode).toBe('AUTH_FAILED');
      expect(exception.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(exception.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should create InvalidCredentialsException', () => {
      const exception = new InvalidCredentialsException();

      expect(exception.message).toBe('Invalid email or password');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('should create TokenExpiredException', () => {
      const exception = new TokenExpiredException();

      expect(exception.message).toBe('Authentication token has expired');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.errorCode).toBe('TOKEN_EXPIRED');
    });

    it('should create InvalidTokenException', () => {
      const exception = new InvalidTokenException();

      expect(exception.message).toBe(
        'Invalid or malformed authentication token',
      );
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.errorCode).toBe('INVALID_TOKEN');
    });
  });

  describe('Authorization Exceptions', () => {
    it('should create AuthorizationException', () => {
      const exception = new AuthorizationException('Custom authz error');

      expect(exception.message).toBe('Custom authz error');
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe('AUTH_FORBIDDEN');
      expect(exception.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(exception.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should create InsufficientPermissionsException', () => {
      const exception = new InsufficientPermissionsException('admin', 'user');

      expect(exception.message).toBe(
        'Insufficient permissions. Required: admin, Current: user',
      );
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
      expect(exception.context).toEqual({
        requiredRole: 'admin',
        userRole: 'user',
      });
    });

    it('should create ResourceAccessDeniedException', () => {
      const exception = new ResourceAccessDeniedException('order', 'user123');

      expect(exception.message).toBe('Access denied to resource: order');
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe('RESOURCE_ACCESS_DENIED');
      expect(exception.context).toEqual({
        resource: 'order',
        userId: 'user123',
      });
    });
  });

  describe('Business Logic Exceptions', () => {
    it('should create InsufficientFundsException', () => {
      const exception = new InsufficientFundsException(1000, 500);

      expect(exception.message).toBe(
        'Insufficient funds. Required: ₹1000, Available: ₹500',
      );
      expect(exception.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(exception.errorCode).toBe('INSUFFICIENT_FUNDS');
      expect(exception.category).toBe(ErrorCategory.BUSINESS_LOGIC);
      expect(exception.severity).toBe(ErrorSeverity.HIGH);
      expect(exception.context).toEqual({ required: 1000, available: 500 });
    });

    it('should create OrderNotFoundException', () => {
      const exception = new OrderNotFoundException('order123');

      expect(exception.message).toBe('Order with ID order123 not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('ORDER_NOT_FOUND');
      expect(exception.context).toEqual({ orderId: 'order123' });
    });

    it('should create InvalidOrderStatusException', () => {
      const exception = new InvalidOrderStatusException('pending', 'cancel');

      expect(exception.message).toBe('Cannot cancel order with status pending');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('INVALID_ORDER_STATUS');
      expect(exception.context).toEqual({
        currentStatus: 'pending',
        attemptedAction: 'cancel',
      });
    });

    it('should create ProductOutOfStockException', () => {
      const exception = new ProductOutOfStockException('iPhone 15', 'prod123');

      expect(exception.message).toBe('Product iPhone 15 is out of stock');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('PRODUCT_OUT_OF_STOCK');
      expect(exception.context).toEqual({
        productName: 'iPhone 15',
        productId: 'prod123',
      });
    });

    it('should create DeliveryZoneNotSupportedException', () => {
      const exception = new DeliveryZoneNotSupportedException('Remote Island');

      expect(exception.message).toBe(
        'Delivery is not available in Remote Island. Please check our service areas.',
      );
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('DELIVERY_ZONE_NOT_SUPPORTED');
      expect(exception.context).toEqual({ location: 'Remote Island' });
    });

    it('should create InvalidSubscriptionException', () => {
      const exception = new InvalidSubscriptionException(
        'Subscription expired',
      );

      expect(exception.message).toBe('Subscription expired');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('INVALID_SUBSCRIPTION');
    });

    it('should create WalletTransactionException', () => {
      const exception = new WalletTransactionException(
        'Transaction failed',
        'txn123',
      );

      expect(exception.message).toBe('Transaction failed');
      expect(exception.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(exception.errorCode).toBe('WALLET_TRANSACTION_FAILED');
      expect(exception.context).toEqual({ transactionId: 'txn123' });
    });
  });

  describe('Database Exceptions', () => {
    it('should create DatabaseException', () => {
      const exception = new DatabaseException(
        'Connection timeout',
        'insert',
        true,
      );

      expect(exception.message).toBe('Connection timeout');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.errorCode).toBe('DATABASE_ERROR');
      expect(exception.category).toBe(ErrorCategory.DATABASE);
      expect(exception.severity).toBe(ErrorSeverity.HIGH);
      expect(exception.context).toEqual({ operation: 'insert' });
      expect(exception.retryable).toBe(true);
    });

    it('should create RecordNotFoundException', () => {
      const exception = new RecordNotFoundException('User', 'user123');

      expect(exception.message).toBe('User not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('RECORD_NOT_FOUND');
      expect(exception.context).toEqual({
        resource: 'User',
        identifier: 'user123',
      });
    });

    it('should create DuplicateRecordException', () => {
      const exception = new DuplicateRecordException('User', 'email');

      expect(exception.message).toBe('Duplicate User found');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('DUPLICATE_RECORD');
      expect(exception.context).toEqual({ resource: 'User', field: 'email' });
    });

    it('should create DatabaseConnectionException', () => {
      const exception = new DatabaseConnectionException('Connection failed');

      expect(exception.message).toBe('Connection failed');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.errorCode).toBe('DATABASE_CONNECTION_ERROR');
      expect(exception.severity).toBe(ErrorSeverity.CRITICAL);
      expect(exception.retryable).toBe(true);
    });
  });

  describe('External Service Exceptions', () => {
    it('should create ExternalServiceException', () => {
      const exception = new ExternalServiceException(
        'payment-gateway',
        'Gateway timeout',
        true,
      );

      expect(exception.message).toBe(
        'External service payment-gateway error: Gateway timeout',
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(exception.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
      expect(exception.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
      expect(exception.severity).toBe(ErrorSeverity.HIGH);
      expect(exception.context).toEqual({ service: 'payment-gateway' });
      expect(exception.retryable).toBe(true);
    });

    it('should create PaymentServiceException', () => {
      const exception = new PaymentServiceException(
        'Payment declined',
        'txn123',
      );

      expect(exception.message).toBe('Payment service error: Payment declined');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(exception.errorCode).toBe('PAYMENT_SERVICE_ERROR');
      expect(exception.severity).toBe(ErrorSeverity.CRITICAL);
      expect(exception.context).toEqual({ transactionId: 'txn123' });
      expect(exception.retryable).toBe(true);
    });

    it('should create NotificationServiceException', () => {
      const exception = new NotificationServiceException(
        'SMS failed',
        'user123',
      );

      expect(exception.message).toBe('Notification service error: SMS failed');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(exception.errorCode).toBe('NOTIFICATION_SERVICE_ERROR');
      expect(exception.context).toEqual({ recipient: 'user123' });
      expect(exception.retryable).toBe(true);
    });
  });

  describe('System Exceptions', () => {
    it('should create ConfigurationException', () => {
      const exception = new ConfigurationException(
        'Missing API key',
        'STRIPE_API_KEY',
      );

      expect(exception.message).toBe('Configuration error: Missing API key');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.errorCode).toBe('CONFIGURATION_ERROR');
      expect(exception.category).toBe(ErrorCategory.SYSTEM);
      expect(exception.severity).toBe(ErrorSeverity.CRITICAL);
      expect(exception.context).toEqual({ configKey: 'STRIPE_API_KEY' });
      expect(exception.retryable).toBe(false);
    });

    it('should create RateLimitException', () => {
      const exception = new RateLimitException('Custom rate limit message');

      expect(exception.message).toBe('Custom rate limit message');
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(exception.category).toBe(ErrorCategory.SYSTEM);
      expect(exception.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should create CircuitBreakerException', () => {
      const exception = new CircuitBreakerException(
        'payment-service',
        'Circuit open',
      );

      expect(exception.message).toBe('payment-service: Circuit open');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.errorCode).toBe('CIRCUIT_BREAKER_OPEN');
      expect(exception.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
      expect(exception.severity).toBe(ErrorSeverity.HIGH);
      expect(exception.context).toEqual({ service: 'payment-service' });
      expect(exception.retryable).toBe(true);
    });

    it('should create ConflictException', () => {
      const context = { resource: 'order', id: '123' };
      const exception = new ConflictException('Resource conflict', context);

      expect(exception.message).toBe('Resource conflict');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('CONFLICT_ERROR');
      expect(exception.category).toBe(ErrorCategory.BUSINESS_LOGIC);
      expect(exception.severity).toBe(ErrorSeverity.MEDIUM);
      expect(exception.context).toEqual(context);
      expect(exception.retryable).toBe(false);
    });
  });

  describe('Error Response Structure', () => {
    it('should ensure all exceptions have consistent error response structure', () => {
      const exceptions = [
        new ValidationException('test'),
        new AuthenticationException(),
        new AuthorizationException(),
        new InsufficientFundsException(100, 50),
        new OrderNotFoundException('123'),
        new DatabaseException('test'),
        new ExternalServiceException('test', 'error'),
        new ConfigurationException('test'),
      ];

      exceptions.forEach((exception) => {
        const response = exception.getErrorResponse();

        expect(response).toHaveProperty('error');
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
        expect(response.error).toHaveProperty('category');
        expect(response.error).toHaveProperty('severity');
        expect(response.error).toHaveProperty('timestamp');
        expect(response.error).toHaveProperty('retryable');
        expect(response.error).toHaveProperty('context');

        expect(typeof response.error.code).toBe('string');
        expect(typeof response.error.message).toBe('string');
        expect(Object.values(ErrorCategory)).toContain(response.error.category);
        expect(Object.values(ErrorSeverity)).toContain(response.error.severity);
        expect(typeof response.error.timestamp).toBe('string');
        expect(typeof response.error.retryable).toBe('boolean');
        expect(typeof response.error.context).toBe('object');
      });
    });

    it('should handle empty context gracefully', () => {
      const exception = new BusinessException('test');
      const response = exception.getErrorResponse();

      expect(response.error.context).toEqual({});
    });
  });
});
