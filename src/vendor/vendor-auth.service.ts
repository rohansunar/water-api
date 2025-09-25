import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CustomLoggerService } from '../common/logger/logger.service';
import {
  VendorSignupDto,
  VendorLoginDto,
  VendorAuthResponseDto,
  VendorProfileDto,
} from '../common/dto/vendor.dto';

@Injectable()
export class VendorAuthService {
  private readonly logger = new Logger(VendorAuthService.name);
  private prisma = new PrismaClient();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customLogger: CustomLoggerService,
  ) {}

  async signup(signupDto: VendorSignupDto): Promise<VendorAuthResponseDto> {
    const startTime = Date.now();
    try {
      const { businessName, email, password, phone } = signupDto;

      // Log vendor signup attempt
      this.customLogger.logSecurityEvent('vendor_signup_attempt', { email, businessName }, undefined, undefined);

      // Check if vendor already exists with this email
      const findStartTime = Date.now();
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { email },
      });
      this.customLogger.logDatabaseOperation('find', 'vendors', Date.now() - findStartTime, !!existingVendor);

      if (existingVendor) {
        this.customLogger.logSecurityEvent('vendor_signup_failure', { email, businessName, reason: 'email_already_exists' }, undefined, undefined);
        throw new ConflictException('Vendor with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create vendor
      const createStartTime = Date.now();
      const vendor = await this.prisma.vendor.create({
        data: {
          name: businessName,
          email,
          passwordHash: hashedPassword,
          phone,
          isActive: true, // Auto-approve for now, can be changed to pending approval later
        },
      });
      this.customLogger.logDatabaseOperation('create', 'vendors', Date.now() - createStartTime, true);

      // Generate JWT token
      const payload = {
        sub: vendor.id.toString(),
        email: vendor.email,
        role: 'vendor',
        businessName: vendor.name,
      };

      const token = this.jwtService.sign(payload);
      const expiresIn = 3600; // 1 hour

      this.customLogger.logSecurityEvent('vendor_signup_success', { email, businessName, vendorId: vendor.id.toString() }, vendor.id.toString(), undefined);
      this.customLogger.logBusinessEvent('vendor_registered', { vendorId: vendor.id.toString(), email, businessName }, vendor.id.toString());

      return {
        token,
        vendor: this.mapToProfileDto(vendor),
        expiresIn,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.customLogger.logSecurityEvent('vendor_signup_error', { email: signupDto.email, error: error.message }, undefined, undefined);
      this.logger.error(`Vendor signup failed for ${signupDto.email}:`, error);
      throw new ConflictException('Vendor registration failed');
    }
  }

  async login(loginDto: VendorLoginDto): Promise<VendorAuthResponseDto> {
    const startTime = Date.now();
    try {
      const { email, password } = loginDto;

      // Log vendor login attempt
      this.customLogger.logSecurityEvent('vendor_login_attempt', { email }, undefined, undefined);

      // Find vendor by email
      const findStartTime = Date.now();
      const vendor = await this.prisma.vendor.findUnique({
        where: { email },
      });
      this.customLogger.logDatabaseOperation('find', 'vendors', Date.now() - findStartTime, !!vendor);

      if (!vendor) {
        this.customLogger.logSecurityEvent('vendor_login_failure', { email, reason: 'vendor_not_found' }, undefined, undefined);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if account is active
      if (!vendor.isActive) {
        this.customLogger.logSecurityEvent('vendor_login_failure', { email, vendorId: vendor.id.toString(), reason: 'account_inactive' }, undefined, undefined);
        throw new ForbiddenException('Account is inactive');
      }

      // Verify password
      if (!vendor.passwordHash) {
        this.customLogger.logSecurityEvent('vendor_login_failure', { email, vendorId: vendor.id.toString(), reason: 'no_password_hash' }, undefined, undefined);
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, vendor.passwordHash);
      if (!isPasswordValid) {
        this.customLogger.logSecurityEvent('vendor_login_failure', { email, vendorId: vendor.id.toString(), reason: 'invalid_password' }, undefined, undefined);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate JWT token
      const payload = {
        sub: vendor.id.toString(),
        email: vendor.email,
        role: 'vendor',
        businessName: vendor.name,
      };

      const token = this.jwtService.sign(payload);
      const expiresIn = 3600; // 1 hour

      // Update last active timestamp
      const updateStartTime = Date.now();
      await this.prisma.vendor.update({
        where: { id: vendor.id },
        data: { lastActiveAt: new Date() },
      });
      this.customLogger.logDatabaseOperation('update', 'vendors', Date.now() - updateStartTime, true);

      this.customLogger.logSecurityEvent('vendor_login_success', { email, vendorId: vendor.id.toString() }, vendor.id.toString(), undefined);
      this.customLogger.logBusinessEvent('vendor_authenticated', { vendorId: vendor.id.toString(), email }, vendor.id.toString());

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
      this.customLogger.logSecurityEvent('vendor_login_error', { email: loginDto.email, error: error.message }, undefined, undefined);
      this.logger.error(`Vendor login failed for ${loginDto.email}:`, error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateVendor(vendorId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: BigInt(vendorId) },
      });
      this.customLogger.logDatabaseOperation('find', 'vendors', Date.now() - startTime, !!vendor);

      if (!vendor || !vendor.isActive) {
        this.customLogger.logSecurityEvent('vendor_validation_failure', { vendorId, reason: 'vendor_not_found_or_inactive' }, undefined, undefined);
        throw new UnauthorizedException('Vendor not found or inactive');
      }

      return vendor;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.customLogger.logDatabaseOperation('find', 'vendors', Date.now() - startTime, false, error);
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