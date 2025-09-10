import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/interfaces/user.interface';
import { User } from '../common/interfaces/user.interface';
import { MonthlyLedgerService } from './monthly-ledger.service';
import {
  CreateMonthlyLedgerDto,
  MonthlyLedgerResponseDto,
  MonthlyBillingSummaryDto,
  GenerateInvoiceDto,
} from '../common/dto/monthly-ledger.dto';

@Controller('api/monthly-ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonthlyLedgerController {
  private readonly logger = new Logger(MonthlyLedgerController.name);

  constructor(private readonly monthlyLedgerService: MonthlyLedgerService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  async createLedgerEntry(
    @Body() createDto: CreateMonthlyLedgerDto,
  ): Promise<MonthlyLedgerResponseDto> {
    this.logger.log(
      `Creating monthly ledger entry for user ${createDto.userId}`,
    );
    return this.monthlyLedgerService.createLedgerEntry(createDto);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR)
  async getUserLedgerEntries(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<MonthlyLedgerResponseDto[]> {
    // Users can only access their own ledger entries unless they're admin
    if (user.role !== UserRole.ADMIN && user.id !== userId) {
      userId = user.id;
    }

    this.logger.log(`Getting ledger entries for user ${userId}`);
    return this.monthlyLedgerService.getUserLedgerEntries(
      userId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Get('vendor/:vendorId')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  async getVendorLedgerEntries(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<MonthlyLedgerResponseDto[]> {
    this.logger.log(`Getting ledger entries for vendor ${vendorId}`);
    return this.monthlyLedgerService.getVendorLedgerEntries(
      vendorId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Get('summary/:userId/:vendorId')
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR)
  async getMonthlyBillingSummary(
    @Param('userId') userId: string,
    @Param('vendorId') vendorId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @CurrentUser() user: User,
  ): Promise<MonthlyBillingSummaryDto> {
    // Users can only access their own billing summary unless they're admin or vendor
    if (user.role === UserRole.CUSTOMER && user.id !== userId) {
      userId = user.id;
    }

    this.logger.log(
      `Getting monthly billing summary for user ${userId} and vendor ${vendorId}`,
    );
    return this.monthlyLedgerService.getMonthlyBillingSummary(
      userId,
      vendorId,
      parseInt(month),
      parseInt(year),
    );
  }

  @Put(':ledgerId/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  async markLedgerEntryPaid(
    @Param('ledgerId') ledgerId: string,
  ): Promise<MonthlyLedgerResponseDto> {
    this.logger.log(`Marking ledger entry ${ledgerId} as paid`);
    return this.monthlyLedgerService.markLedgerEntryPaid(ledgerId);
  }

  @Get('pending-dues')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  async getPendingDues(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<MonthlyBillingSummaryDto[]> {
    this.logger.log(`Getting pending dues for month ${month}, year ${year}`);
    return this.monthlyLedgerService.getPendingDues(
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }
}
