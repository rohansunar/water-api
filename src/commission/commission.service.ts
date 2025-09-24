import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  CommissionScope,
  CommissionRule,
  CommissionCalculation,
} from '../common/interfaces/commission.interface';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  CommissionRuleResponseDto,
  CommissionCalculationDto,
} from '../common/dto/commission.dto';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private prisma = new PrismaClient();

  /**
   * Create a new commission rule
   */
  async createCommissionRule(
    createDto: CreateCommissionRuleDto,
    adminId: bigint,
  ): Promise<CommissionRuleResponseDto> {
    try {
      this.logger.log(`Creating commission rule for scope ${createDto.scope}`);

      // Validate scopeId based on scope
      if (
        (createDto.scope === CommissionScope.CATEGORY ||
          createDto.scope === CommissionScope.VENDOR ||
          createDto.scope === CommissionScope.PRODUCT) &&
        !createDto.scopeId
      ) {
        throw new BadRequestException(
          `scopeId is required for scope ${createDto.scope}`,
        );
      }

      if (createDto.scope === CommissionScope.GLOBAL && createDto.scopeId) {
        throw new BadRequestException(
          'scopeId should not be provided for GLOBAL scope',
        );
      }

      const rule = await this.prisma.commissionRule.create({
        data: {
          scope: createDto.scope,
          scopeId: createDto.scopeId,
          percentage: createDto.percentage,
          priority: createDto.priority || 0,
          isActive: createDto.isActive !== undefined ? createDto.isActive : true,
          createdBy: adminId,
        },
      });

      return this.mapToResponseDto(rule);
    } catch (error) {
      this.logger.error(`Failed to create commission rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all commission rules with optional filtering
   */
  async getCommissionRules(
    scope?: CommissionScope,
    isActive?: boolean,
  ): Promise<CommissionRuleResponseDto[]> {
    try {
      const where: any = {};
      if (scope) where.scope = scope;
      if (isActive !== undefined) where.isActive = isActive;

      const rules = await this.prisma.commissionRule.findMany({
        where,
        orderBy: [
          { scope: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return rules.map((rule) => this.mapToResponseDto(rule));
    } catch (error) {
      this.logger.error(`Failed to get commission rules: ${error.message}`);
      throw new BadRequestException('Failed to retrieve commission rules');
    }
  }

  /**
   * Get commission rule by ID
   */
  async getCommissionRuleById(id: bigint): Promise<CommissionRuleResponseDto> {
    try {
      const rule = await this.prisma.commissionRule.findUnique({
        where: { id },
      });

      if (!rule) {
        throw new NotFoundException('Commission rule not found');
      }

      return this.mapToResponseDto(rule);
    } catch (error) {
      this.logger.error(`Failed to get commission rule ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update commission rule
   */
  async updateCommissionRule(
    id: bigint,
    updateDto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    try {
      this.logger.log(`Updating commission rule ${id}`);

      // Validate scopeId if scope is being updated
      if (updateDto.scope) {
        if (
          (updateDto.scope === CommissionScope.CATEGORY ||
            updateDto.scope === CommissionScope.VENDOR ||
            updateDto.scope === CommissionScope.PRODUCT) &&
          !updateDto.scopeId
        ) {
          // Check if existing rule has scopeId
          const existingRule = await this.prisma.commissionRule.findUnique({
            where: { id },
          });
          if (!existingRule?.scopeId && !updateDto.scopeId) {
            throw new BadRequestException(
              `scopeId is required for scope ${updateDto.scope}`,
            );
          }
        }

        if (updateDto.scope === CommissionScope.GLOBAL && updateDto.scopeId) {
          throw new BadRequestException(
            'scopeId should not be provided for GLOBAL scope',
          );
        }
      }

      const rule = await this.prisma.commissionRule.update({
        where: { id },
        data: {
          scope: updateDto.scope,
          scopeId: updateDto.scopeId,
          percentage: updateDto.percentage,
          priority: updateDto.priority,
          isActive: updateDto.isActive,
        },
      });

      return this.mapToResponseDto(rule);
    } catch (error) {
      this.logger.error(`Failed to update commission rule ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete commission rule (soft delete by deactivating)
   */
  async deleteCommissionRule(id: bigint): Promise<{ message: string }> {
    try {
      this.logger.log(`Deactivating commission rule ${id}`);

      await this.prisma.commissionRule.update({
        where: { id },
        data: { isActive: false },
      });

      return { message: 'Commission rule deactivated successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete commission rule ${id}: ${error.message}`);
      throw new BadRequestException('Failed to delete commission rule');
    }
  }

  /**
   * Calculate commission for an order item
   * Priority resolution: PRODUCT > CATEGORY > VENDOR > GLOBAL
   */
  async calculateCommission(
    productId: string,
    category: string,
    vendorId: string,
    orderAmount: number,
  ): Promise<CommissionCalculationDto> {
    try {
      // Get all active rules
      const rules = await this.prisma.commissionRule.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });

      // Priority order: PRODUCT > CATEGORY > VENDOR > GLOBAL
      const priorityOrder = [
        CommissionScope.PRODUCT,
        CommissionScope.CATEGORY,
        CommissionScope.VENDOR,
        CommissionScope.GLOBAL,
      ];

      let selectedRule: any = null;

      for (const scope of priorityOrder) {
        const matchingRules = rules.filter((rule) => rule.scope === scope);

        if (matchingRules.length > 0) {
          switch (scope) {
            case CommissionScope.PRODUCT:
              selectedRule = matchingRules.find(
                (rule) => rule.scopeId === productId,
              );
              break;
            case CommissionScope.CATEGORY:
              selectedRule = matchingRules.find(
                (rule) => rule.scopeId === category,
              );
              break;
            case CommissionScope.VENDOR:
              selectedRule = matchingRules.find(
                (rule) => rule.scopeId === vendorId,
              );
              break;
            case CommissionScope.GLOBAL:
              selectedRule = matchingRules[0]; // Any global rule
              break;
          }

          if (selectedRule) break;
        }
      }

      if (!selectedRule) {
        // Default commission if no rule found
        this.logger.warn(
          `No commission rule found for product ${productId}, using default 10%`,
        );
        return {
          ruleId: '0',
          percentage: 10,
          amount: orderAmount * 0.1,
          scope: CommissionScope.GLOBAL,
        };
      }

      const commissionAmount = (orderAmount * selectedRule.percentage) / 100;

      return {
        ruleId: selectedRule.id.toString(),
        percentage: Number(selectedRule.percentage),
        amount: commissionAmount,
        scope: selectedRule.scope,
        scopeId: selectedRule.scopeId || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate commission: ${error.message}`);
      throw new BadRequestException('Failed to calculate commission');
    }
  }

  private mapToResponseDto(rule: any): CommissionRuleResponseDto {
    return {
      id: rule.id.toString(),
      scope: rule.scope,
      scopeId: rule.scopeId,
      percentage: Number(rule.percentage),
      priority: rule.priority,
      isActive: rule.isActive,
      createdBy: rule.createdBy.toString(),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}