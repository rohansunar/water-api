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
export class CommissionController {
  private readonly logger = new Logger(CommissionController.name);

  constructor(private readonly commissionService: CommissionService) {}

  @Get()
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
  async getCommissionRuleById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CommissionRuleResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving commission rule ${id}`);
    return this.commissionService.getCommissionRuleById(BigInt(id));
  }

  @Put(':id')
  async updateCommissionRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommissionRuleDto,
    @CurrentUser() user: User,
  ): Promise<CommissionRuleResponseDto> {
    this.logger.log(`Admin ${user.id} updating commission rule ${id}`);
    return this.commissionService.updateCommissionRule(BigInt(id), updateDto);
  }

  @Delete(':id')
  async deleteCommissionRule(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} deleting commission rule ${id}`);
    return this.commissionService.deleteCommissionRule(BigInt(id));
  }
}
