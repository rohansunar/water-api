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
  ) {}

  async login(loginDto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    try {
      const { email, password } = loginDto;

      // Find admin by email
      const admin = await this.prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if account is active
      if (!admin.isActive) {
        throw new ForbiddenException('Account is inactive');
      }

      // Verify password
      if (!admin.passwordHash) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isPasswordValid) {
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
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { lastActiveAt: new Date() },
      });

      this.logger.log(`Admin ${admin.email} authenticated successfully`);

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
      this.logger.error(`Admin login failed for ${loginDto.email}:`, error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateAdmin(adminId: string): Promise<any> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: BigInt(adminId) },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Admin not found or inactive');
    }

    return admin;
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