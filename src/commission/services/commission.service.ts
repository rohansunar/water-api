import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CommissionScope,
  CommissionRule,
  CommissionCalculation,
} from '../interfaces/commission.interface';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  CommissionRuleResponseDto,
  CommissionCalculationDto,
} from '../../common/dto/commission.dto';

/**
 * Commission Service - Multi-Level Commission Calculation Engine
 *
 * This service implements a sophisticated commission calculation system with hierarchical
 * priority resolution and scope-based business rules. It manages commission rules across
 * different scopes (Product, Category, Vendor, Global) and calculates commissions for
 * order transactions based on complex business logic.
 *
 * Architecture:
 * - **Hierarchical Priority System**: PRODUCT > CATEGORY > VENDOR > GLOBAL
 * - **Scope-Based Rules**: Rules can be applied at different levels of specificity
 * - **Dynamic Rule Resolution**: Automatically selects the most specific applicable rule
 * - **Financial Integration**: Seamlessly integrates with ledger and transaction systems
 *
 * Key Features:
 * - CRUD operations for commission rules with validation
 * - Real-time commission calculation with priority resolution
 * - Multi-level fallback system (defaults to 10% if no rules match)
 * - Comprehensive logging and error handling
 * - Scope validation and business rule enforcement
 *
 * Business Logic:
 * - Commission rules are evaluated in strict priority order
 * - Each scope level can have multiple rules, highest priority wins
 * - Global rules serve as ultimate fallback for any unmatched scenarios
 * - Rules can be activated/deactivated without deletion for audit purposes
 *
 * Commission Calculation Algorithm:
 * The service implements a sophisticated 6-phase algorithm for commission calculation:
 *
 * 1. **Rule Retrieval Phase**: Fetches all active commission rules sorted by priority
 * 2. **Priority Resolution Phase**: Defines hierarchical scope order (PRODUCT > CATEGORY > VENDOR > GLOBAL)
 * 3. **Hierarchical Matching Phase**: Iterates through each scope level to find matches
 * 4. **Fallback Mechanism Phase**: Applies 10% default commission if no rules match
 * 5. **Final Calculation Phase**: Computes commission amount using selected rule
 * 6. **Result Formatting Phase**: Returns standardized calculation result
 *
 * Priority Resolution Rules:
 * - **PRODUCT Scope**: Most specific rules targeting individual products
 * - **CATEGORY Scope**: Category-level rules for product groupings
 * - **VENDOR Scope**: Vendor-specific commission rates
 * - **GLOBAL Scope**: System-wide fallback rules
 *
 * Business Rule Patterns:
 * - **Specificity Override**: More specific scopes always override general ones
 * - **Priority Inheritance**: Within same scope, higher priority numbers win
 * - **Soft Delete Pattern**: Rules are deactivated, not deleted, for audit trails
 * - **Validation Coupling**: Scope and scopeId are validated together
 * - **Default Fallback**: 10% commission ensures calculation never fails
 *
 * @author Commission Management System
 * @version 1.0.0
 */
@Injectable()
export class CommissionService {
  /**
   * Logger instance for tracking commission operations and debugging
   *
   * This logger provides comprehensive audit trails for:
   * - Commission rule creation, updates, and deletions
   * - Commission calculation attempts and results
   * - Priority resolution decisions and fallback scenarios
   * - Error conditions and validation failures
   * - Performance metrics and debugging information
   *
   * @private
   * @readonly
   */
  private readonly logger = new Logger(CommissionService.name);

  /**
   * Prisma service for database operations and transaction management
   *
   * This service handles all database interactions including:
   * - Commission rule CRUD operations with proper indexing
   * - Complex queries for priority-based rule resolution
   * - Transaction management for data consistency
   * - Connection pooling and performance optimization
   * - Type-safe database operations with Prisma schema validation
   * - Enhanced error handling and retry mechanisms
   *
   * @private
   */
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Creates a new commission rule with comprehensive validation and business logic enforcement.
   *
   * This method implements strict validation rules to ensure data integrity and business rule compliance:
   * - Validates scopeId requirement based on commission scope type
   * - Enforces scope-specific constraints (e.g., GLOBAL scope cannot have scopeId)
   * - Sets default values for optional fields (priority, isActive)
   * - Maintains audit trail with adminId tracking
   *
   * @param createDto - Data transfer object containing commission rule creation data
   * @param adminId - ID of the admin creating the rule for audit purposes
   * @returns Promise<CommissionRuleResponseDto> - Created commission rule with mapped response format
   *
   * @throws BadRequestException - When validation fails (missing scopeId, invalid scope combinations)
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const rule = await commissionService.createCommissionRule(
   *   {
   *     scope: CommissionScope.PRODUCT,
   *     scopeId: 'product-123',
   *     percentage: 15.5,
   *     priority: 10,
   *     isActive: true
   *   },
   *   BigInt('123')
   * );
   * ```
   */
  async createCommissionRule(
    createDto: CreateCommissionRuleDto,
    adminId: bigint,
  ): Promise<CommissionRuleResponseDto> {
    try {
      this.logger.log(`Creating commission rule for scope ${createDto.scope}`);

      // === SCOPE VALIDATION LOGIC ===
      // Business Rule: Specific scopes (CATEGORY, VENDOR, PRODUCT) require scopeId
      // This ensures rules are properly targeted to specific entities
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

      // Business Rule: GLOBAL scope should never have scopeId
      // Global rules apply system-wide and don't target specific entities
      if (createDto.scope === CommissionScope.GLOBAL && createDto.scopeId) {
        throw new BadRequestException(
          'scopeId should not be provided for GLOBAL scope',
        );
      }

      const rule = await this.prismaService.commissionRule.create({
        data: {
          scope: createDto.scope,
          scopeId: createDto.scopeId,
          percentage: createDto.percentage,
          priority: createDto.priority || 0,
          isActive:
            createDto.isActive !== undefined ? createDto.isActive : true,
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
   * Retrieves commission rules with flexible filtering and intelligent sorting.
   * Enhanced with pagination support for better performance with large datasets.
   *
   * This method provides comprehensive rule retrieval with multiple filtering options:
   * - Filter by specific commission scope (PRODUCT, CATEGORY, VENDOR, GLOBAL)
   * - Filter by activation status to get active/inactive rules
   * - Pagination support for handling large rule sets efficiently
   * - Returns all rules if no filters are applied
   *
   * The results are automatically sorted by a multi-level hierarchy:
   * 1. Primary sort: Scope (ascending) - maintains logical grouping
   * 2. Secondary sort: Priority (descending) - highest priority first
   * 3. Tertiary sort: Creation date (descending) - newest rules first
   *
   * @param scope - Optional scope filter to retrieve rules for specific commission level
   * @param isActive - Optional boolean filter to get only active or inactive rules
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of rules per page (default: 50, max: 100)
   * @returns Promise<{ rules: CommissionRuleResponseDto[], total: number, page: number, totalPages: number }> - Paginated commission rules with metadata
   *
   * @throws BadRequestException - When database query fails or invalid parameters provided
   *
   * @example
   * ```typescript
   * // Get first page of all active rules (50 per page)
   * const { rules, total, totalPages } = await commissionService.getCommissionRules(undefined, true, 1, 50);
   *
   * // Get only product-specific rules with pagination
   * const { rules, total } = await commissionService.getCommissionRules(CommissionScope.PRODUCT, undefined, 1, 20);
   *
   * // Get all rules (no filtering) with custom pagination
   * const { rules, total, page, totalPages } = await commissionService.getCommissionRules(undefined, undefined, 2, 25);
   * ```
   */
  async getCommissionRules(
    scope?: CommissionScope,
    isActive?: boolean,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    rules: CommissionRuleResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Validate pagination parameters
      if (page < 1) {
        throw new BadRequestException('Page number must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      const where: any = {};
      if (scope) where.scope = scope;
      if (isActive !== undefined) where.isActive = isActive;

      const skip = (page - 1) * limit;

      // Execute parallel queries for better performance
      const [rules, total] = await Promise.all([
        this.prismaService.commissionRule.findMany({
          where,
          orderBy: [
            { scope: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: limit,
        }),
        this.prismaService.commissionRule.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        rules: rules.map((rule) => this.mapToResponseDto(rule)),
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get commission rules: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve commission rules');
    }
  }

  /**
   * Retrieves a specific commission rule by its unique identifier.
   *
   * This method performs a direct database lookup for a single commission rule.
   * It includes proper error handling for cases where the rule doesn't exist,
   * throwing a standardized NotFoundException to maintain consistent API behavior.
   *
   * @param id - Unique identifier of the commission rule to retrieve
   * @returns Promise<CommissionRuleResponseDto> - Single commission rule with mapped response format
   *
   * @throws NotFoundException - When no commission rule exists with the provided ID
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const rule = await commissionService.getCommissionRuleById(BigInt('123'));
   * console.log(`Rule: ${rule.percentage}% for scope ${rule.scope}`);
   * ```
   */
  async getCommissionRuleById(id: bigint): Promise<CommissionRuleResponseDto> {
    try {
      const rule = await this.prismaService.commissionRule.findUnique({
        where: { id },
      });

      if (!rule) {
        throw new NotFoundException('Commission rule not found');
      }

      return this.mapToResponseDto(rule);
    } catch (error) {
      this.logger.error(
        `Failed to get commission rule ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Updates an existing commission rule with comprehensive validation and business logic enforcement.
   *
   * This method implements sophisticated update logic with conditional validation:
   * - Validates scopeId requirements when scope is being updated
   * - Checks existing rule's scopeId if not provided in update
   * - Enforces scope-specific constraints during updates
   * - Maintains data integrity across scope transitions
   *
   * The update process handles partial updates gracefully:
   * - Only updates fields that are explicitly provided
   * - Preserves existing values for undefined fields
   * - Maintains audit trail integrity
   *
   * @param id - Unique identifier of the commission rule to update
   * @param updateDto - Data transfer object containing fields to update
   * @returns Promise<CommissionRuleResponseDto> - Updated commission rule with mapped response format
   *
   * @throws BadRequestException - When validation fails (missing scopeId, invalid scope combinations)
   * @throws Error - When database operation fails or rule doesn't exist
   *
   * @example
   * ```typescript
   * const updatedRule = await commissionService.updateCommissionRule(
   *   BigInt('123'),
   *   {
   *     percentage: 18.5,
   *     priority: 5,
   *     isActive: true
   *   }
   * );
   * ```
   */
  async updateCommissionRule(
    id: bigint,
    updateDto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    try {
      this.logger.log(`Updating commission rule ${id}`);

      // === COMPLEX SCOPE UPDATE VALIDATION ===
      // When updating scope, we need to handle scope transitions carefully
      if (updateDto.scope) {
        // Business Rule: Specific scopes require scopeId
        if (
          (updateDto.scope === CommissionScope.CATEGORY ||
            updateDto.scope === CommissionScope.VENDOR ||
            updateDto.scope === CommissionScope.PRODUCT) &&
          !updateDto.scopeId
        ) {
          // Fallback: Check if existing rule has scopeId for backward compatibility
          // This handles cases where scopeId might be inherited from existing rule
          const existingRule = await this.prismaService.commissionRule.findUnique({
            where: { id },
          });
          if (!existingRule?.scopeId && !updateDto.scopeId) {
            throw new BadRequestException(
              `scopeId is required for scope ${updateDto.scope}`,
            );
          }
        }

        // Business Rule: GLOBAL scope cannot have scopeId during updates
        // This prevents scope transition errors and maintains data integrity
        if (updateDto.scope === CommissionScope.GLOBAL && updateDto.scopeId) {
          throw new BadRequestException(
            'scopeId should not be provided for GLOBAL scope',
          );
        }
      }

      const rule = await this.prismaService.commissionRule.update({
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
      this.logger.error(
        `Failed to update commission rule ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Soft deletes a commission rule by deactivating it rather than permanent removal.
   *
   * This method implements a soft delete strategy to maintain audit trails and
   * historical data integrity. Instead of physically removing the rule from the database,
   * it sets the isActive flag to false, preserving the record for reporting and analysis.
   *
   * Benefits of soft delete approach:
   * - Maintains complete audit trail for compliance
   * - Preserves historical commission calculations
   * - Allows for rule reactivation if needed
   * - Supports reporting on deactivated rules
   *
   * @param id - Unique identifier of the commission rule to deactivate
   * @returns Promise<{ message: string }> - Success confirmation message
   *
   * @throws BadRequestException - When database operation fails
   *
   * @example
   * ```typescript
   * const result = await commissionService.deleteCommissionRule(BigInt('123'));
   * console.log(result.message); // "Commission rule deactivated successfully"
   * ```
   */
  async deleteCommissionRule(id: bigint): Promise<{ message: string }> {
    try {
      this.logger.log(`Deactivating commission rule ${id}`);

      await this.prismaService.commissionRule.update({
        where: { id },
        data: { isActive: false },
      });

      return { message: 'Commission rule deactivated successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to delete commission rule ${id}: ${error.message}`,
      );
      throw new BadRequestException('Failed to delete commission rule');
    }
  }

  /**
   * Calculates commission for an order item using sophisticated multi-level priority resolution algorithm.
   *
   * This method implements the core commission calculation engine with hierarchical rule resolution:
   * 1. **PRODUCT** scope - Most specific, highest priority matching
   * 2. **CATEGORY** scope - Category-level commission rules
   * 3. **VENDOR** scope - Vendor-specific commission rates
   * 4. **GLOBAL** scope - System-wide fallback commission
   *
   * Algorithm Flow:
   * - Retrieves all active commission rules ordered by priority (highest first)
   * - Iterates through priority order array to find the most specific match
   * - For each scope level, finds the first rule that matches the provided identifiers
   * - Returns immediately upon finding the first match (highest priority wins)
   * - Falls back to default 10% commission if no rules match
   *
   * Business Rules:
   * - Only active rules (isActive: true) are considered
   * - Higher priority numbers take precedence within the same scope
   * - Scope hierarchy ensures most specific rules override general ones
   * - Default fallback prevents calculation failures
   *
   * @param productId - Unique identifier for the product being ordered
   * @param category - Product category identifier for category-level rules
   * @param vendorId - Vendor identifier for vendor-specific commission rates
   * @param orderAmount - Monetary amount of the order for commission calculation
   * @returns Promise<CommissionCalculationDto> - Detailed commission calculation result
   *
   * @throws BadRequestException - When database operation fails
   *
   * @example
   * ```typescript
   * const commission = await commissionService.calculateCommission(
   *   'product-123',
   *   'electronics',
   *   'vendor-456',
   *   100.00
   * );
   * console.log(`Commission: $${commission.amount} at ${commission.percentage}%`);
   * ```
   */
  async calculateCommission(
    productId: string,
    category: string,
    vendorId: string,
    orderAmount: number,
  ): Promise<CommissionCalculationDto> {
    try {
      const selectedRule = await this.findApplicableCommissionRule(
        productId,
        category,
        vendorId,
      );

      if (!selectedRule) {
        this.logger.warn(
          `No commission rule found for product ${productId}, using default 10%`,
        );
        return this.getDefaultCommissionCalculation(orderAmount);
      }

      return this.calculateCommissionAmount(selectedRule, orderAmount);
    } catch (error) {
      this.logger.error(`Failed to calculate commission: ${error.message}`);
      throw new BadRequestException('Failed to calculate commission');
    }
  }

  /**
   * Finds the most applicable commission rule using hierarchical priority resolution.
   * Optimized to use database queries instead of loading all rules into memory.
   *
   * @private
   * @param productId - Product identifier
   * @param category - Product category
   * @param vendorId - Vendor identifier
   * @returns Promise with applicable rule or null
   */
  private async findApplicableCommissionRule(
    productId: string,
    category: string,
    vendorId: string,
  ): Promise<any> {
    // Define the hierarchical priority order for rule resolution
    const priorityOrder = [
      { scope: CommissionScope.PRODUCT, identifier: productId },
      { scope: CommissionScope.CATEGORY, identifier: category },
      { scope: CommissionScope.VENDOR, identifier: vendorId },
      { scope: CommissionScope.GLOBAL, identifier: null },
    ];

    // Check each scope level in priority order
    for (const { scope, identifier } of priorityOrder) {
      const rule = await this.findRuleForScope(scope, identifier);
      if (rule) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Finds a commission rule for a specific scope and identifier.
   *
   * @private
   * @param scope - Commission scope to search
   * @param identifier - Identifier to match (null for GLOBAL scope)
   * @returns Promise with matching rule or null
   */
  private async findRuleForScope(
    scope: CommissionScope,
    identifier: string | null,
  ): Promise<any> {
    const whereClause: any = {
      scope,
      isActive: true,
    };

    // Add identifier filter for specific scopes
    if (scope !== CommissionScope.GLOBAL && identifier) {
      whereClause.scopeId = identifier;
    }

    const rules = await this.prismaService.commissionRule.findMany({
      where: whereClause,
      orderBy: { priority: 'desc' },
      take: 1, // Only need the highest priority rule
    });

    return rules[0] || null;
  }

  /**
   * Returns the default commission calculation when no rules match.
   *
   * @private
   * @param orderAmount - The order amount
   * @returns Default commission calculation
   */
  private getDefaultCommissionCalculation(orderAmount: number): CommissionCalculationDto {
    return {
      ruleId: '0',
      percentage: 10,
      amount: orderAmount * 0.1,
      scope: CommissionScope.GLOBAL,
    };
  }

  /**
   * Calculates the commission amount using the selected rule.
   *
   * @private
   * @param rule - The commission rule to apply
   * @param orderAmount - The order amount
   * @returns Calculated commission result
   */
  private calculateCommissionAmount(
    rule: any,
    orderAmount: number,
  ): CommissionCalculationDto {
    const commissionAmount = (orderAmount * rule.percentage) / 100;

    return {
      ruleId: rule.id.toString(),
      percentage: Number(rule.percentage),
      amount: commissionAmount,
      scope: rule.scope,
      scopeId: rule.scopeId || undefined,
    };
  }

  /**
   * Maps database commission rule entity to standardized response DTO.
   *
   * This utility method transforms raw database entities into consistent API response objects,
   * ensuring proper data type conversion and field mapping. It handles BigInt to string
   * conversion for JSON serialization compatibility and maintains consistent response structure.
   *
   * @private
   * @param rule - Raw commission rule entity from database
   * @returns CommissionRuleResponseDto - Standardized response object for API consumption
   *
   * @example
   * ```typescript
   * const responseDto = this.mapToResponseDto(databaseRule);
   * // Converts BigInt IDs to strings and ensures consistent typing
   * ```
   */
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
