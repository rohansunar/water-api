import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, statusCode);
  }
}

export class InsufficientFundsException extends BusinessException {
  constructor(required: number, available: number) {
    super(
      `Insufficient funds. Required: ₹${required}, Available: ₹${available}`,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class OrderNotFoundException extends BusinessException {
  constructor(orderId: string) {
    super(`Order with ID ${orderId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidOrderStatusException extends BusinessException {
  constructor(currentStatus: string, attemptedAction: string) {
    super(
      `Cannot ${attemptedAction} order with status ${currentStatus}`,
      HttpStatus.CONFLICT,
    );
  }
}

export class ProductOutOfStockException extends BusinessException {
  constructor(productName: string) {
    super(`Product ${productName} is out of stock`, HttpStatus.CONFLICT);
  }
}

export class DeliveryZoneNotSupportedException extends BusinessException {
  constructor(location: string) {
    super(
      `Delivery is not available in ${location}. Please check our service areas.`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidSubscriptionException extends BusinessException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class WalletTransactionException extends BusinessException {
  constructor(message: string) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}

export class AuthenticationException extends BusinessException {
  constructor(message: string = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class AuthorizationException extends BusinessException {
  constructor(message: string = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN);
  }
}
