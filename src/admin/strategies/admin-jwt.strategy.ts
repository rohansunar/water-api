import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthService } from '../services/admin-auth.service';
import { CustomLoggerService } from '../../common/logger/logger.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  roleLevel: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminAuthService: AdminAuthService,
    private readonly customLogger: CustomLoggerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ADMIN_SECRET',
        'admin-jwt-secret-key',
      ),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<any> {
    this.customLogger.log(
      `[DEBUG] AdminJwtStrategy.validate invoked for admin ID: ${payload.sub}, email: ${payload.email}`,
    );
    this.customLogger.debug(
      `AdminJwtStrategy.validate called with payload: ${JSON.stringify(payload)}`,
    );
    try {
      const admin = await this.adminAuthService.validateAdmin(payload.sub);
      this.customLogger.debug(
        `Admin validation successful for admin ID: ${payload.sub}`,
      );
      return {
        id: admin.id.toString(),
        email: admin.email,
        name: admin.name,
        roleLevel: admin.roleLevel,
        permissions: admin.permissions,
      };
    } catch (error) {
      // Log JWT validation errors
      this.customLogger.logSecurityEvent(
        'admin_jwt_validation_failure',
        {
          adminId: payload.sub,
          email: payload.email,
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
        throw new UnauthorizedException('Invalid token or admin not found');
      }
    }
  }
}
