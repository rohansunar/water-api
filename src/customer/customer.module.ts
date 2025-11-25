import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomerController } from './controllers/customer.controller';
import { CustomerAuthController } from './controllers/customer-auth.controller';
import { CustomerSubscriptionController } from './controllers/customer.subscription.controller';
import { CustomerSearchController } from './controllers/customer-search.controller';
import { CustomerService } from './services/customer.service';
import { CustomerAuthService } from './services/customer-auth.service';
import { SubscriptionService } from './services/subscription.service';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { CustomLoggerService } from '../common/logger/logger.service';
import { OtpService } from '../common/services/otp.service';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'customer-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'water-jar-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
    ProductModule,
  ],
  controllers: [
    CustomerController,
    CustomerAuthController,
    CustomerSubscriptionController,
    CustomerSearchController,
  ],
  providers: [
    CustomerService,
    CustomerAuthService,
    SubscriptionService,
    CustomerJwtStrategy,
    CustomLoggerService,
    OtpService,
  ],
  exports: [
    CustomerService,
    CustomerAuthService,
    SubscriptionService,
    CustomerJwtStrategy,
  ],
})
export class CustomerModule {}
