import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';
import * as fs from 'fs'; 

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger:
        process.env.NODE_ENV !== 'test' ? new CustomLoggerService() : false,
    },
  );

  // Enable CORS with comprehensive configuration for Fastify
  await app.register(import('@fastify/cors'), {
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

  // Security headers with comprehensive configuration for Fastify
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
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
  });

  // Multipart support for file uploads
  await app.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 10, // max 10 files
    },
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger/OpenAPI Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Water Jar Delivery Platform API')
    .setDescription(
      'Comprehensive API for the Water Jar Delivery Platform. This API provides endpoints for user authentication, order management, delivery tracking, vendor operations, and administrative functions. The platform supports customers, vendors, delivery riders, and administrators with role-based access control.',
    )
    .setVersion('4.0.0')
    .setContact(
      'Water Jar Delivery Team',
      'https://waterjardelivery.com',
      'support@waterjardelivery.com',
    )
    .addBearerAuth()  
    .addTag('Authentication', 'User authentication and OTP verification')
    .addTag('Users', 'User profile and address management')
    .addTag('Riders', 'Delivery rider operations and order management')
    .addTag('Vendors', 'Vendor operations and product management')
    .addTag('Orders', 'Order creation, tracking, and management')
    .addTag('Products', 'Product catalog and inventory')
    .addTag('Subscriptions', 'Subscription management and recurring orders')
    .addTag('Wallet', 'Wallet operations and balance management')
    .addTag('Complaints', 'Customer complaint management')
    .addTag('Admin', 'Administrative operations and reporting')
    .addTag('Health', 'System health and status checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Water Jar Delivery API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c5aa0 }
    `,
  });

  fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2));


  // Seed test data for development
  // const userService = app.get(UserService);
  // await userService.seedTestData();

  // const { VendorService } = await import('./vendor/vendor.service');
  // const vendorService = app.get(VendorService);
  // await vendorService.seedTestData();

  // const { ProductService } = await import('./product/product.service');
  // const productService = app.get(ProductService);
  // await productService.seedTestData();

  // const { RiderService } = await import('./rider/rider.service');
  // const riderService = app.get(RiderService);
  // await riderService.seedTestData();

  // const { ComplaintService } = await import('./complaint/complaint.service');
  // const complaintService = app.get(ComplaintService);
  // await complaintService.seedTestData();

  const port = process.env.PORT || 4242;
  await app.listen(port);

  logger.log(
    `🚀 Water Jar Delivery API is running on: http://localhost:${port}`,
  );
  logger.log(`📋 Health check available at: http://localhost:${port}/health`);
  logger.log(
    `📚 API Documentation available at: http://localhost:${port}/docs`,
  );
}
bootstrap();
