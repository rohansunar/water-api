import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { User } from '../../common/interfaces/user.interface';

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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'water-jar-secret-key'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    try {
      const user = await this.authService.validateUser(payload.sub);
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token or user not found');
    }
  }
}
