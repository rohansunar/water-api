import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorAuthService } from './services/vendor-auth.service';
import { VendorJwtStrategy } from './strategies/vendor-jwt.strategy';
import { OtpService } from '../common/services/otp.service';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    ConfigModule,
    ProductModule,
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
  providers: [
    VendorAuthService,
    VendorJwtStrategy,
    OtpService,
  ],
  exports: [VendorAuthService, VendorJwtStrategy],
})
export class VendorAuthModule {}
