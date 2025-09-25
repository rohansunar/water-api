import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CustomLoggerService } from '../common/logger/logger.service';
import {
  AdminLoginDto,
  AdminAuthResponseDto,
  AdminProfileDto,
} from '../common/dto/admin.dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private prisma = new PrismaClient();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customLogger: CustomLoggerService,
  ) {}

  async login(loginDto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    const startTime = Date.now();
    try {
      const { email, password } = loginDto;

      // Log admin login attempt
      this.customLogger.logSecurityEvent('admin_login_attempt', { email }, undefined, undefined);

      // Find admin by email
      const findStartTime = Date.now();
      const admin = await this.prisma.admin.findUnique({
        where: { email },
      });
      this.customLogger.logDatabaseOperation('find', 'admins', Date.now() - findStartTime, !!admin);

      if (!admin) {
        this.customLogger.logSecurityEvent('admin_login_failure', { email, reason: 'admin_not_found' }, undefined, undefined);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if account is active
      if (!admin.isActive) {
        this.customLogger.logSecurityEvent('admin_login_failure', { email, adminId: admin.id.toString(), reason: 'account_inactive' }, undefined, undefined);
        throw new ForbiddenException('Account is inactive');
      }

      // Verify password
      if (!admin.passwordHash) {
        this.customLogger.logSecurityEvent('admin_login_failure', { email, adminId: admin.id.toString(), reason: 'no_password_hash' }, undefined, undefined);
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isPasswordValid) {
        this.customLogger.logSecurityEvent('admin_login_failure', { email, adminId: admin.id.toString(), reason: 'invalid_password' }, undefined, undefined);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate JWT token
      const payload = {
        sub: admin.id.toString(),
        email: admin.email,
        role: 'admin',
        roleLevel: admin.roleLevel,
      };

      const token = this.jwtService.sign(payload);
      const expiresIn = 3600; // 1 hour

      // Update last active timestamp
      const updateStartTime = Date.now();
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { lastActiveAt: new Date() },
      });
      this.customLogger.logDatabaseOperation('update', 'admins', Date.now() - updateStartTime, true);

      this.customLogger.logSecurityEvent('admin_login_success', { email, adminId: admin.id.toString() }, admin.id.toString(), undefined);
      this.customLogger.logBusinessEvent('admin_authenticated', { adminId: admin.id.toString(), email }, admin.id.toString());

      return {
        token,
        admin: this.mapToProfileDto(admin),
        expiresIn,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.customLogger.logSecurityEvent('admin_login_error', { email: loginDto.email, error: error.message }, undefined, undefined);
      this.logger.error(`Admin login failed for ${loginDto.email}:`, error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateAdmin(adminId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: BigInt(adminId) },
      });
      this.customLogger.logDatabaseOperation('find', 'admins', Date.now() - startTime, !!admin);

      if (!admin || !admin.isActive) {
        this.customLogger.logSecurityEvent('admin_validation_failure', { adminId, reason: 'admin_not_found_or_inactive' }, undefined, undefined);
        throw new UnauthorizedException('Admin not found or inactive');
      }

      return admin;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.customLogger.logDatabaseOperation('find', 'admins', Date.now() - startTime, false, error);
      throw error;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private mapToProfileDto(admin: any): AdminProfileDto {
    return {
      id: admin.id.toString(),
      email: admin.email,
      name: admin.name,
      roleLevel: admin.roleLevel,
      permissions: admin.permissions,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }
}