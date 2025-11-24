import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomerController } from './controllers/customer.controller';
import { CustomerAuthController } from './controllers/customer-auth.controller';
import { CustomerSubscriptionController } from './controllers/customer.subscription.controller';
import { CustomerService } from './services/customer.service';
import { CustomerAuthService } from './services/customer-auth.service';
import { CustomerSubscriptionService } from './services/customer.subscription.service';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { CustomLoggerService } from '../common/logger/logger.service';
import { OtpService } from '../common/services/otp.service';

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
  ],
  controllers: [
    CustomerController,
    CustomerAuthController,
    CustomerSubscriptionController,
  ],
  providers: [
    CustomerService,
    CustomerAuthService,
    CustomerSubscriptionService,
    CustomerJwtStrategy,
    CustomLoggerService,
    OtpService,
  ],
  exports: [
    CustomerService,
    CustomerAuthService,
    CustomerSubscriptionService,
    CustomerJwtStrategy,
  ],
})
export class CustomerModule {}
