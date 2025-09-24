import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthService } from '../admin-auth.service';

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
    try {
      const admin = await this.adminAuthService.validateAdmin(payload.sub);
      return {
        id: admin.id.toString(),
        email: admin.email,
        name: admin.name,
        roleLevel: admin.roleLevel,
        permissions: admin.permissions,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token or admin not found');
    }
  }
}