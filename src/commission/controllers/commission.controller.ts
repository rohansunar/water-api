import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';
import { User } from '../../common/interfaces/user.interface';
import { CommissionService } from '../services/commission.service';
import { CommissionScope } from '../interfaces/commission.interface';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  CommissionRuleResponseDto,
} from '../dto/commission.dto';

@Controller('admin/commissions/rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Wallet')
@ApiBearerAuth()
export class CommissionController {
  private readonly logger = new Logger(CommissionController.name);

  constructor(private readonly commissionService: CommissionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get commission rules',
    description: 'Retrieve a paginated list of commission rules',
  })
  @ApiQuery({ name: 'scope', required: false, enum: CommissionScope })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Commission rules retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCommissionRules(
    @CurrentUser() user: User,
    @Query('scope') scope?: CommissionScope,
    @Query('isActive') isActive?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    rules: CommissionRuleResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.logger.log(
      `Admin ${user.id} retrieving commission rules with filters: scope=${scope}, isActive=${isActive}, page=${page}, limit=${limit}`,
    );
    return this.commissionService.getCommissionRules(
      scope,
      isActive,
      page,
      limit,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create commission rule',
    description: 'Create a new commission rule',
  })
  @ApiBody({ type: CreateCommissionRuleDto })
  @ApiResponse({
    status: 201,
    description: 'Commission rule created successfully',
    type: CommissionRuleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createCommissionRule(
    @Body() createDto: CreateCommissionRuleDto,
    @CurrentUser() user: User,
  ): Promise<CommissionRuleResponseDto> {
    this.logger.log(
      `Admin ${user.id} creating commission rule for scope ${createDto.scope}`,
    );
    return this.commissionService.createCommissionRule(
      createDto,
      BigInt(user.id),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get commission rule by ID',
    description: 'Retrieve a specific commission rule by its ID',
  })
  @ApiParam({ name: 'id', description: 'Commission rule ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Commission rule retrieved successfully',
    type: CommissionRuleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Commission rule not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCommissionRuleById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CommissionRuleResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving commission rule ${id}`);
    return this.commissionService.getCommissionRuleById(BigInt(id));
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update commission rule',
    description: 'Update an existing commission rule',
  })
  @ApiParam({ name: 'id', description: 'Commission rule ID', type: String })
  @ApiBody({ type: UpdateCommissionRuleDto })
  @ApiResponse({
    status: 200,
    description: 'Commission rule updated successfully',
    type: CommissionRuleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Commission rule not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateCommissionRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommissionRuleDto,
    @CurrentUser() user: User,
  ): Promise<CommissionRuleResponseDto> {
    this.logger.log(`Admin ${user.id} updating commission rule ${id}`);
    return this.commissionService.updateCommissionRule(BigInt(id), updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete commission rule',
    description: 'Delete a commission rule',
  })
  @ApiParam({ name: 'id', description: 'Commission rule ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Commission rule deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Commission rule not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteCommissionRule(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} deleting commission rule ${id}`);
    return this.commissionService.deleteCommissionRule(BigInt(id));
  }
}
