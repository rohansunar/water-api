import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  VendorLoginDto,
  VendorAuthResponseDto,
  VendorProfileDto,
} from '../dto/vendor.dto';

@Injectable()
export class VendorAuthService {
  private readonly logger = new Logger(VendorAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customLogger: CustomLoggerService,
    private readonly prismaService: PrismaService,
  ) {}


  async login(loginDto: VendorLoginDto): Promise<VendorAuthResponseDto> {
    const startTime = Date.now();
    try {
      const { phone, password } = loginDto;

      // Log vendor login attempt
      this.customLogger.logSecurityEvent(
        'vendor_login_attempt',
        { phone },
        undefined,
        undefined,
      );

      // Find vendor by phone
      const findStartTime = Date.now();
      const vendor = await this.prismaService.vendor.findUnique({
        where: { phone },
      });
      this.customLogger.logDatabaseOperation(
        'find',
        'vendors',
        Date.now() - findStartTime,
        !!vendor,
      );

      if (!vendor) {
        this.customLogger.logSecurityEvent(
          'vendor_login_failure',
          { phone, reason: 'vendor_not_found' },
          undefined,
          undefined,
        );
        throw new UnauthorizedException('Invalid phone or password');
      }

      // Check if account is active
      if (!vendor.isActive) {
        this.customLogger.logSecurityEvent(
          'vendor_login_failure',
          { phone, vendorId: vendor.id.toString(), reason: 'account_inactive' },
          undefined,
          undefined,
        );
        throw new ForbiddenException('Account is inactive');
      }

      // Verify password
      if (!vendor.passwordHash) {
        this.customLogger.logSecurityEvent(
          'vendor_login_failure',
          { phone, vendorId: vendor.id.toString(), reason: 'no_password_hash' },
          undefined,
          undefined,
        );
        throw new UnauthorizedException('Invalid phone or password');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        vendor.passwordHash,
      );
      if (!isPasswordValid) {
        this.customLogger.logSecurityEvent(
          'vendor_login_failure',
          { phone, vendorId: vendor.id.toString(), reason: 'invalid_password' },
          undefined,
          undefined,
        );
        throw new UnauthorizedException('Invalid phone or password');
      }

      // Generate JWT token
      const payload = {
        sub: vendor.id.toString(),
        phone: vendor.phone,
        role: 'vendor',
        businessName: vendor.name,
      };

      const token = this.jwtService.sign(payload);
      const expiresIn = 3600; // 1 hour

      // Update last active timestamp
      const updateStartTime = Date.now();
      await this.prismaService.vendor.update({
        where: { id: vendor.id },
        data: { lastActiveAt: new Date() },
      });
      this.customLogger.logDatabaseOperation(
        'update',
        'vendors',
        Date.now() - updateStartTime,
        true,
      );

      this.customLogger.logSecurityEvent(
        'vendor_login_success',
        { phone, vendorId: vendor.id.toString() },
        vendor.id.toString(),
        undefined,
      );
      this.customLogger.logBusinessEvent(
        'vendor_authenticated',
        { vendorId: vendor.id.toString(), phone },
        vendor.id.toString(),
      );

      return {
        token,
        vendor: this.mapToProfileDto(vendor),
        expiresIn,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.customLogger.logSecurityEvent(
        'vendor_login_error',
        { phone: loginDto.phone, error: error.message },
        undefined,
        undefined,
      );
      this.logger.error(`Vendor login failed for ${loginDto.phone}:`, error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateVendor(vendorId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const vendor = await this.prismaService.vendor.findUnique({
        where: { id: BigInt(vendorId) },
      });
      this.customLogger.logDatabaseOperation(
        'find',
        'vendors',
        Date.now() - startTime,
        !!vendor,
      );

      if (!vendor || !vendor.isActive) {
        this.customLogger.logSecurityEvent(
          'vendor_validation_failure',
          { vendorId, reason: 'vendor_not_found_or_inactive' },
          undefined,
          undefined,
        );
        throw new UnauthorizedException('Vendor not found or inactive');
      }

      return vendor;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.customLogger.logDatabaseOperation(
        'find',
        'vendors',
        Date.now() - startTime,
        false,
        error,
      );
      throw error;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private mapToProfileDto(vendor: any): VendorProfileDto {
    return {
      id: vendor.id.toString(),
      businessName: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: '', // Address is stored in VendorAddress table, not directly on Vendor
      isActive: vendor.isActive,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}
