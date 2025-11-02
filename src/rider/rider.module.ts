import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RiderController } from './controllers/rider.controller';
import { RiderAuthController } from './controllers/rider-auth.controller';
import { RiderService } from './services/rider.service';
import { RiderAuthService } from './services/rider-auth.service';
import { OtpService } from '../common/services/otp.service';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    ConfigModule,
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
    OrderModule,
  ],
  controllers: [RiderController, RiderAuthController],
  providers: [RiderService, RiderAuthService, OtpService],
  exports: [RiderService, RiderAuthService],
})
export class RiderModule {}
