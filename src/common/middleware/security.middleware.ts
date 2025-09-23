import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private readonly logger: CustomLoggerService) {}

  use(req: any, res: any, next: () => void) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const method = req.method;
    const url = req.url;

    // Log suspicious activity
    this.detectSuspiciousActivity(req, ip, userAgent);

    // Add security headers - use setHeader for NestJS + Fastify compatibility
    if (res.setHeader) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-Powered-By', ''); // Remove server information
    } else if (res.header) {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    next();
  }

  private detectSuspiciousActivity(
    req: FastifyRequest,
    ip: string,
    userAgent: string,
  ) {
    const suspiciousPatterns = [
      /\b(union|select|insert|delete|drop|create|alter|exec|script)\b/i,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /onload|onerror|onclick/i,
    ];

    const requestBody = JSON.stringify(req.body || {});
    const queryString = JSON.stringify((req as any).query || {});
    const fullContent = `${requestBody} ${queryString} ${req.url}`;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fullContent)) {
        this.logger.logSecurityEvent(
          'suspicious_request',
          {
            pattern: pattern.toString(),
            url: req.url,
            method: req.method,
            body: req.body,
            query: (req as any).query,
          },
          ip,
          userAgent,
        );
        break;
      }
    }

    // Detect potential brute force attempts
    if (req.url.includes('/auth/') && req.method === 'POST') {
      this.logger.logSecurityEvent(
        'auth_attempt',
        {
          url: req.url,
          method: req.method,
        },
        ip,
        userAgent,
      );
    }

    // Detect unusual user agents
    if (
      !userAgent ||
      userAgent.length < 10 ||
      /bot|crawler|spider/i.test(userAgent)
    ) {
      this.logger.logSecurityEvent(
        'unusual_user_agent',
        {
          userAgent,
          url: req.url,
        },
        ip,
        userAgent,
      );
    }
  }
}
