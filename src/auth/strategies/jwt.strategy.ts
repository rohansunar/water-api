import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { User } from '../../modules/user/entities/user.entity';
import { CustomLoggerService } from '../../common/logger/logger.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
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

  async validate(payload: JwtPayload): Promise<User> {
    try {
      const user = await this.authService.validateUser(payload.sub);
      return user;
    } catch (error) {
      // Log JWT validation errors
      this.customLogger.logSecurityEvent('jwt_validation_failure', {
        userId: payload.sub,
        phone: payload.phone,
        error: error.message,
        errorName: error.name,
      }, undefined, undefined);

      // Handle specific JWT errors with clear messages
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please login again.');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format. Please login again.');
      } else if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet. Please try again later.');
      } else {
        throw new UnauthorizedException('Invalid token or user not found');
      }
    }
  }
}
