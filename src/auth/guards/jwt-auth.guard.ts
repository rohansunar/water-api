import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Skip authentication for admin routes - they use their own guards
    if (path.startsWith('/admin')) {
      return true;
    }

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Handle authentication errors properly to prevent memory leaks
    if (err) {
      // Log the error for debugging (consider using a logger service in production)
      console.error('JWT Authentication error:', err.message || err);

      // Ensure error is properly handled and doesn't cause memory leaks
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

    return user;
  }
}
