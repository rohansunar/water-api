import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  module?: string;
  operation?: string;
  metadata?: Record<string, any>;
  field?: string;
  requiredRole?: string;
  userRole?: string;
  resource?: string;
  identifier?: string;
  required?: number;
  available?: number;
  orderId?: string;
  currentStatus?: string;
  attemptedAction?: string;
  productName?: string;
  productId?: string;
  location?: string;
  transactionId?: string;
  recipient?: string;
  configKey?: string;
  service?: string;
}

export class BusinessException extends HttpException {
  public readonly errorCode: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    errorCode: string = 'GENERIC_ERROR',
    category: ErrorCategory = ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    retryable: boolean = false,
  ) {
    super(message, statusCode);
    this.errorCode = errorCode;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.retryable = retryable;

    // Ensure the error name includes the error code for better debugging
    this.name = `${this.constructor.name}[${errorCode}]`;
  }

  /**
   * Get structured error response for API clients
   */
  getErrorResponse(): Record<string, any> {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        category: this.category,
        severity: this.severity,
        timestamp: this.timestamp.toISOString(),
        retryable: this.retryable,
        context: this.context,
      },
    };
  }
}

// Validation Errors
export class ValidationException extends BusinessException {
  constructor(message: string, field?: string) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { field },
      false,
    );
  }
}

export class InvalidInputException extends BusinessException {
  constructor(message: string, field?: string) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'INVALID_INPUT',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { field },
      false,
    );
  }
}

export class MissingRequiredFieldException extends BusinessException {
  constructor(field: string) {
    super(
      `Required field '${field}' is missing`,
      HttpStatus.BAD_REQUEST,
      'MISSING_REQUIRED_FIELD',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { field },
      false,
    );
  }
}

// Authentication Errors
export class AuthenticationException extends BusinessException {
  constructor(message: string = 'Authentication failed') {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      'AUTH_FAILED',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      {},
      false,
    );
  }
}

export class InvalidCredentialsException extends BusinessException {
  constructor() {
    super(
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      {},
      false,
    );
  }
}

export class TokenExpiredException extends BusinessException {
  constructor() {
    super(
      'Authentication token has expired',
      HttpStatus.UNAUTHORIZED,
      'TOKEN_EXPIRED',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      {},
      false,
    );
  }
}

export class InvalidTokenException extends BusinessException {
  constructor() {
    super(
      'Invalid or malformed authentication token',
      HttpStatus.UNAUTHORIZED,
      'INVALID_TOKEN',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      {},
      false,
    );
  }
}

// Authorization Errors
export class AuthorizationException extends BusinessException {
  constructor(message: string = 'Access denied') {
    super(
      message,
      HttpStatus.FORBIDDEN,
      'AUTH_FORBIDDEN',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      {},
      false,
    );
  }
}

export class InsufficientPermissionsException extends BusinessException {
  constructor(requiredRole: string, userRole: string) {
    super(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${userRole}`,
      HttpStatus.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      { requiredRole, userRole },
      false,
    );
  }
}

export class ResourceAccessDeniedException extends BusinessException {
  constructor(resource: string, userId: string) {
    super(
      `Access denied to resource: ${resource}`,
      HttpStatus.FORBIDDEN,
      'RESOURCE_ACCESS_DENIED',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      { resource, userId },
      false,
    );
  }
}

// Business Logic Errors
export class InsufficientFundsException extends BusinessException {
  constructor(required: number, available: number) {
    super(
      `Insufficient funds. Required: ₹${required}, Available: ₹${available}`,
      HttpStatus.PAYMENT_REQUIRED,
      'INSUFFICIENT_FUNDS',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.HIGH,
      { required, available },
      false,
    );
  }
}

export class OrderNotFoundException extends BusinessException {
  constructor(orderId: string) {
    super(
      `Order with ID ${orderId} not found`,
      HttpStatus.NOT_FOUND,
      'ORDER_NOT_FOUND',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { orderId },
      false,
    );
  }
}

export class InvalidOrderStatusException extends BusinessException {
  constructor(currentStatus: string, attemptedAction: string) {
    super(
      `Cannot ${attemptedAction} order with status ${currentStatus}`,
      HttpStatus.CONFLICT,
      'INVALID_ORDER_STATUS',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { currentStatus, attemptedAction },
      false,
    );
  }
}

export class ProductOutOfStockException extends BusinessException {
  constructor(productName: string, productId?: string) {
    super(
      `Product ${productName} is out of stock`,
      HttpStatus.CONFLICT,
      'PRODUCT_OUT_OF_STOCK',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { productName, productId },
      false,
    );
  }
}

export class DeliveryZoneNotSupportedException extends BusinessException {
  constructor(location: string) {
    super(
      `Delivery is not available in ${location}. Please check our service areas.`,
      HttpStatus.NOT_FOUND,
      'DELIVERY_ZONE_NOT_SUPPORTED',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.LOW,
      { location },
      false,
    );
  }
}

export class InvalidSubscriptionException extends BusinessException {
  constructor(message: string) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'INVALID_SUBSCRIPTION',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      {},
      false,
    );
  }
}

export class WalletTransactionException extends BusinessException {
  constructor(message: string, transactionId?: string) {
    super(
      message,
      HttpStatus.PAYMENT_REQUIRED,
      'WALLET_TRANSACTION_FAILED',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.HIGH,
      { transactionId },
      false,
    );
  }
}

// Database Errors
export class DatabaseException extends BusinessException {
  constructor(message: string, operation?: string, retryable: boolean = true) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_ERROR',
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      { operation },
      retryable,
    );
  }
}

export class RecordNotFoundException extends BusinessException {
  constructor(resource: string, identifier?: string) {
    super(
      `${resource} not found`,
      HttpStatus.NOT_FOUND,
      'RECORD_NOT_FOUND',
      ErrorCategory.DATABASE,
      ErrorSeverity.MEDIUM,
      { resource, identifier },
      false,
    );
  }
}

export class DuplicateRecordException extends BusinessException {
  constructor(resource: string, field?: string) {
    super(
      `Duplicate ${resource} found`,
      HttpStatus.CONFLICT,
      'DUPLICATE_RECORD',
      ErrorCategory.DATABASE,
      ErrorSeverity.MEDIUM,
      { resource, field },
      false,
    );
  }
}

export class DatabaseConnectionException extends BusinessException {
  constructor(message: string = 'Database connection failed') {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_CONNECTION_ERROR',
      ErrorCategory.DATABASE,
      ErrorSeverity.CRITICAL,
      {},
      true,
    );
  }
}

// External Service Errors
export class ExternalServiceException extends BusinessException {
  constructor(service: string, message: string, retryable: boolean = true) {
    super(
      `External service ${service} error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      'EXTERNAL_SERVICE_ERROR',
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      { service },
      retryable,
    );
  }
}

export class PaymentServiceException extends BusinessException {
  constructor(message: string, transactionId?: string) {
    super(
      `Payment service error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      'PAYMENT_SERVICE_ERROR',
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.CRITICAL,
      { transactionId },
      true,
    );
  }
}

export class NotificationServiceException extends BusinessException {
  constructor(message: string, recipient?: string) {
    super(
      `Notification service error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      'NOTIFICATION_SERVICE_ERROR',
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      { recipient },
      true,
    );
  }
}

// System Errors
export class ConfigurationException extends BusinessException {
  constructor(message: string, configKey?: string) {
    super(
      `Configuration error: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'CONFIGURATION_ERROR',
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      { configKey },
      false,
    );
  }
}

export class RateLimitException extends BusinessException {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      ErrorCategory.SYSTEM,
      ErrorSeverity.MEDIUM,
      {},
      false,
    );
  }
}

export class CircuitBreakerException extends BusinessException {
  constructor(
    service: string,
    message: string = 'Service temporarily unavailable',
  ) {
    super(
      `${service}: ${message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'CIRCUIT_BREAKER_OPEN',
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      { service },
      true,
    );
  }
}

export class ConflictException extends BusinessException {
  constructor(message: string, context: ErrorContext = {}) {
    super(
      message,
      HttpStatus.CONFLICT,
      'CONFLICT_ERROR',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      context,
      false,
    );
  }
}
