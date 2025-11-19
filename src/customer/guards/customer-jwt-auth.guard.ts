import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

@Injectable()
export class CustomerJwtAuthGuard extends AuthGuard('customer-jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Skip authentication for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Handle authentication errors properly
    if (err) {
      console.error('Customer JWT Authentication error:', err.message || err);

      if (err instanceof Error) {
        throw new UnauthorizedException(err.message || 'Authentication failed');
      } else {
        throw new UnauthorizedException('Authentication failed');
      }
    }

    // Handle missing user (token invalid or expired)
    if (!user) {
      const errorMessage = info?.message || 'Authentication required';
      throw new UnauthorizedException(errorMessage);
    }

    // Ensure user is a customer
    if (user.type !== 'customer') {
      throw new UnauthorizedException(
        'Invalid user type for customer authentication',
      );
    }

    return user;
  }
}
