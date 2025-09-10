import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UserService } from './user/user.service';
import { CustomLoggerService } from './common/logger/logger.service';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: new CustomLoggerService(),
  });

  // Enable CORS with comprehensive configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Security headers with comprehensive configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Seed test data for development
  const userService = app.get(UserService);
  await userService.seedTestData();

  const { VendorService } = await import('./vendor/vendor.service');
  const vendorService = app.get(VendorService);
  await vendorService.seedTestData();

  const { ProductService } = await import('./product/product.service');
  const productService = app.get(ProductService);
  await productService.seedTestData();

  const { AgentService } = await import('./agent/agent.service');
  const agentService = app.get(AgentService);
  await agentService.seedTestData();

  const { ComplaintService } = await import('./complaint/complaint.service');
  const complaintService = app.get(ComplaintService);
  await complaintService.seedTestData();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Water Jar Delivery API is running on: http://localhost:${port}`);
  logger.log(`📋 Health check available at: http://localhost:${port}/health`);
  logger.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/login`);
}
bootstrap();
