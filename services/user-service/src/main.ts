import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { UserModule } from './user.module';

async function bootstrap() {
  const logger = new Logger('UserService');
  
  const app = await NestFactory.create(UserModule);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.USER_SERVICE_PORT || 3001;
  await app.listen(port);
  
  logger.log(`User Service is running on port ${port}`);
}

bootstrap();
