import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { VendorAuthService } from '../services/vendor-auth.service';
import { CustomLoggerService } from '../../common/logger/logger.service';

export interface VendorJwtPayload {
  sub: string;
  phone: string;
  role: string;
  businessName: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class VendorJwtStrategy extends PassportStrategy(
  Strategy,
  'vendor-jwt',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly vendorAuthService: VendorAuthService,
    private readonly customLogger: CustomLoggerService,
  ) {
    const secret = configService.get<string>(
      'JWT_VENDOR_SECRET',
      'vendor-jwt-secret-key',
    );
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.customLogger.log(
      `[DEBUG] VendorJwtStrategy initialized with secret: ${secret.substring(0, 10)}...`,
    );
  }

  async validate(payload: VendorJwtPayload): Promise<any> {
    this.customLogger.log(
      `[DEBUG] VendorJwtStrategy.validate invoked for vendor ID: ${payload.sub}, phone: ${payload.phone}`,
    );
    try {
      const vendor = await this.vendorAuthService.validateVendor(payload.sub);
      this.customLogger.debug(
        `Vendor validation successful for vendor ID: ${payload.sub}`,
      );
      return {
        id: vendor.id.toString(),
        phone: vendor.phone,
        name: vendor.name,
        isActive: vendor.isActive,
      };
    } catch (error) {
      // Log JWT validation errors
      this.customLogger.logSecurityEvent(
        'vendor_jwt_validation_failure',
        {
          vendorId: payload.sub,
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
        throw new UnauthorizedException('Invalid token or vendor not found');
      }
    }
  }
}
