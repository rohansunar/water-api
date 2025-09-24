import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Generate or use existing request ID
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Set request ID in headers
    req.headers['x-request-id'] = requestId;

    // For NestJS + Fastify, use the setHeader method
    if (res.setHeader) {
      res.setHeader('X-Request-ID', requestId);
    } else if (res.header) {
      res.header('X-Request-ID', requestId);
    }

    // Add request ID to request object for easy access
    req.requestId = requestId;

    next();
  }
}
