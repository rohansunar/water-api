import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CustomerAuthService } from '../services/customer-auth.service';
import { CustomLoggerService } from '../../common/logger/logger.service';

export interface CustomerJwtPayload {
  sub: string;
  phone: string;
  role: string;
  type: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly customerAuthService: CustomerAuthService,
    private readonly customLogger: CustomLoggerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'water-jar-secret-key',
      ),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<any> {
    try {
      // Validate that this is a customer token
      if (payload.type !== 'customer') {
        throw new UnauthorizedException('Invalid token type for customer authentication');
      }

      // Validate customer exists and is active
      const isValid = await this.customerAuthService.validateCustomer(payload.sub);
      if (!isValid) {
        throw new UnauthorizedException('Customer not found or inactive');
      }

      // Return customer object
      const customer = {
        id: payload.sub,
        phone: payload.phone,
        role: payload.role,
        type: payload.type,
        isActive: true,
      };

      return customer;
    } catch (error) {
      // Log JWT validation errors
      this.customLogger.logSecurityEvent(
        'customer_jwt_validation_failure',
        {
          userId: payload.sub,
          phone: payload.phone,
          error: error.message,
          errorName: error.name,
        },
        undefined,
        undefined,
      );

      // Handle specific JWT errors with clear messages
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Token has expired. Please login again.',
        );
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'Invalid token format. Please login again.',
        );
      } else if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException(
          'Token not active yet. Please try again later.',
        );
      } else {
        throw new UnauthorizedException('Invalid token or customer not found');
      }
    }
  }
}