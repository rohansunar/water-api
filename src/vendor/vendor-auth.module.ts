import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorAuthService } from './services/vendor-auth.service';
import { VendorJwtStrategy } from './strategies/vendor-jwt.strategy';
import { VendorJwtAuthGuard } from './guards/vendor-jwt-auth.guard';
import { OtpService } from '../common/services/otp.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'vendor-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_VENDOR_SECRET') ||
          'vendor-jwt-secret-key',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [VendorAuthController],
  providers: [VendorAuthService, VendorJwtStrategy, VendorJwtAuthGuard, OtpService],
  exports: [VendorAuthService, VendorJwtStrategy, VendorJwtAuthGuard],
})
export class VendorAuthModule {}
