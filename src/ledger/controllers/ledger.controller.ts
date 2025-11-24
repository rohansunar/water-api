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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerService } from '../services/ledger.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../common/interfaces/user.interface';
import {
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
  LedgerEntryResponseDto,
  CreatePayoutDto,
  PayoutResponseDto,
  GetAnalyticsDto,
  VendorAnalyticsResponseDto,
  LedgerSummaryResponseDto,
} from '../dto/ledger.dto';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
} from '../interfaces/ledger.interface';

/**
 * Ledger Controller
 * Handles vendor ledger, analytics, and payout endpoints
 * Routes follow the API specification without /api prefix
 */
@Controller('vendors/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@ApiTags('Wallet')
@ApiBearerAuth()
export class LedgerController {
  private readonly logger = new Logger(LedgerController.name);

  constructor(private readonly ledgerService: LedgerService) {}

  /**
   * GET /vendors/me/ledger
   * Get vendor's ledger entries with pagination and filtering
   */
  @Get('ledger')
  @ApiOperation({ summary: 'Get vendor ledger', description: 'Retrieve vendor ledger entries with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: LedgerEntryType })
  @ApiQuery({ name: 'status', required: false, enum: LedgerEntryStatus })
  @ApiResponse({ status: 200, description: 'Ledger entries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVendorLedger(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: LedgerEntryType,
    @Query('status') status?: LedgerEntryStatus,
  ): Promise<{
    entries: LedgerEntryResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.logger.log(`Getting ledger entries for vendor ${user.id}`);
    return this.ledgerService.getVendorLedger(
      user.id,
      page,
      limit,
      type,
      status,
    );
  }

  /**
   * POST /vendors/me/ledger
   * Create a new ledger entry (typically used by system/admin)
   */
  @Post('ledger')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Create ledger entry', description: 'Create a new ledger entry' })
  @ApiBody({ type: CreateLedgerEntryDto })
  @ApiResponse({ status: 201, description: 'Ledger entry created successfully', type: LedgerEntryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createLedgerEntry(
    @CurrentUser() user: User,
    @Body() createDto: CreateLedgerEntryDto,
  ): Promise<LedgerEntryResponseDto> {
    this.logger.log(`Creating ledger entry for vendor ${createDto.vendorId}`);

    // Ensure vendor can only create entries for themselves
    if (user.role === 'vendor' && createDto.vendorId !== user.id) {
      throw new Error('Vendors can only create ledger entries for themselves');
    }

    return this.ledgerService.createLedgerEntry(createDto);
  }

  /**
   * GET /vendors/me/analytics
   * Get vendor analytics for specified period
   */
  @Get('analytics')
  @ApiOperation({ summary: 'Get vendor analytics', description: 'Retrieve vendor analytics for specified period' })
  @ApiQuery({ type: GetAnalyticsDto })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: VendorAnalyticsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVendorAnalytics(
    @CurrentUser() user: User,
    @Query() analyticsDto: GetAnalyticsDto,
  ): Promise<VendorAnalyticsResponseDto> {
    this.logger.log(
      `Getting analytics for vendor ${user.id}, period: ${analyticsDto.period}`,
    );
    return this.ledgerService.getVendorAnalytics(user.id, analyticsDto);
  }

  /**
   * GET /vendors/me/ledger/summary
   * Get ledger summary with balance and payout information
   */
  @Get('ledger/summary')
  @ApiOperation({ summary: 'Get ledger summary', description: 'Get ledger summary with balance and payout information' })
  @ApiResponse({ status: 200, description: 'Ledger summary retrieved successfully', type: LedgerSummaryResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getLedgerSummary(
    @CurrentUser() user: User,
  ): Promise<LedgerSummaryResponseDto> {
    this.logger.log(`Getting ledger summary for vendor ${user.id}`);
    return this.ledgerService.getLedgerSummary(user.id);
  }

  /**
   * GET /vendors/me/payouts
   * Get vendor's payout history with pagination
   */
  @Get('payouts')
  @ApiOperation({ summary: 'Get vendor payouts', description: 'Get vendor payout history with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PayoutStatus })
  @ApiResponse({ status: 200, description: 'Payouts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVendorPayouts(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: PayoutStatus,
  ): Promise<{
    payouts: PayoutResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.logger.log(`Getting payouts for vendor ${user.id}`);
    return this.ledgerService.getVendorPayouts(user.id, page, limit, status);
  }

  /**
   * POST /vendors/me/payouts
   * Request a new payout
   */
  @Post('payouts')
  @ApiOperation({ summary: 'Create payout', description: 'Request a new payout' })
  @ApiBody({ type: CreatePayoutDto })
  @ApiResponse({ status: 201, description: 'Payout request created successfully', type: PayoutResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createPayout(
    @CurrentUser() user: User,
    @Body() createDto: CreatePayoutDto,
  ): Promise<PayoutResponseDto> {
    this.logger.log(
      `Creating payout request for vendor ${user.id}, amount: ${createDto.amount}`,
    );
    return this.ledgerService.createPayout(user.id, createDto);
  }
}

/**
 * Admin Ledger Controller
 * Handles admin-specific ledger operations
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminLedgerController {
  private readonly logger = new Logger(AdminLedgerController.name);

  constructor(private readonly ledgerService: LedgerService) {}

  /**
   * GET /admin/vendors/:vendorId/ledger
   * Get any vendor's ledger entries (admin only)
   */
  @Get('vendors/:vendorId/ledger')
  @ApiOperation({ summary: 'Get vendor ledger (admin)', description: 'Get any vendor ledger entries (admin only)' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: LedgerEntryType })
  @ApiQuery({ name: 'status', required: false, enum: LedgerEntryStatus })
  @ApiResponse({ status: 200, description: 'Ledger entries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVendorLedger(
    @Param('vendorId') vendorId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: LedgerEntryType,
    @Query('status') status?: LedgerEntryStatus,
  ): Promise<{
    entries: LedgerEntryResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.logger.log(`Admin getting ledger entries for vendor ${vendorId}`);
    return this.ledgerService.getVendorLedger(
      vendorId,
      page,
      limit,
      type,
      status,
    );
  }

  /**
   * GET /admin/vendors/:vendorId/analytics
   * Get any vendor's analytics (admin only)
   */
  @Get('vendors/:vendorId/analytics')
  @ApiOperation({ summary: 'Get vendor analytics (admin)', description: 'Get any vendor analytics (admin only)' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID', type: String })
  @ApiQuery({ type: GetAnalyticsDto })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: VendorAnalyticsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVendorAnalytics(
    @Param('vendorId') vendorId: string,
    @Query() analyticsDto: GetAnalyticsDto,
  ): Promise<VendorAnalyticsResponseDto> {
    this.logger.log(`Admin getting analytics for vendor ${vendorId}`);
    return this.ledgerService.getVendorAnalytics(vendorId, analyticsDto);
  }

  /**
   * GET /admin/vendors/:vendorId/payouts
   * Get any vendor's payouts (admin only)
   */
  @Get('vendors/:vendorId/payouts')
  @ApiOperation({ summary: 'Get vendor payouts (admin)', description: 'Get any vendor payouts (admin only)' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PayoutStatus })
  @ApiResponse({ status: 200, description: 'Payouts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVendorPayouts(
    @Param('vendorId') vendorId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: PayoutStatus,
  ): Promise<{
    payouts: PayoutResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.logger.log(`Admin getting payouts for vendor ${vendorId}`);
    return this.ledgerService.getVendorPayouts(vendorId, page, limit, status);
  }

  /**
   * POST /admin/ledger-entries
   * Create ledger entry for any vendor (admin only)
   */
  @Post('ledger-entries')
  @ApiOperation({ summary: 'Create ledger entry (admin)', description: 'Create ledger entry for any vendor (admin only)' })
  @ApiBody({ type: CreateLedgerEntryDto })
  @ApiResponse({ status: 201, description: 'Ledger entry created successfully', type: LedgerEntryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createLedgerEntry(
    @CurrentUser() user: User,
    @Body() createDto: CreateLedgerEntryDto,
  ): Promise<LedgerEntryResponseDto> {
    this.logger.log(
      `Admin creating ledger entry for vendor ${createDto.vendorId}`,
    );
    return this.ledgerService.createLedgerEntry(createDto);
  }
}
