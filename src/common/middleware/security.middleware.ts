import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private readonly logger: CustomLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const method = req.method;
    const url = req.url;

    // Log suspicious activity
    this.detectSuspiciousActivity(req, ip, userAgent);

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server information
    res.removeHeader('X-Powered-By');

    next();
  }

  private detectSuspiciousActivity(req: Request, ip: string, userAgent: string) {
    const suspiciousPatterns = [
      /\b(union|select|insert|delete|drop|create|alter|exec|script)\b/i,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /onload|onerror|onclick/i,
    ];

    const requestBody = JSON.stringify(req.body || {});
    const queryString = JSON.stringify(req.query || {});
    const fullContent = `${requestBody} ${queryString} ${req.url}`;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fullContent)) {
        this.logger.logSecurityEvent('suspicious_request', {
          pattern: pattern.toString(),
          url: req.url,
          method: req.method,
          body: req.body,
          query: req.query,
        }, ip, userAgent);
        break;
      }
    }

    // Detect potential brute force attempts
    if (req.url.includes('/auth/') && req.method === 'POST') {
      this.logger.logSecurityEvent('auth_attempt', {
        url: req.url,
        method: req.method,
      }, ip, userAgent);
    }

    // Detect unusual user agents
    if (!userAgent || userAgent.length < 10 || /bot|crawler|spider/i.test(userAgent)) {
      this.logger.logSecurityEvent('unusual_user_agent', {
        userAgent,
        url: req.url,
      }, ip, userAgent);
    }
  }
}
