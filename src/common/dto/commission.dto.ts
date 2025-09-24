import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { CommissionScope } from '../interfaces/commission.interface';

export class CreateCommissionRuleDto {
  @IsEnum(CommissionScope)
  scope: CommissionScope;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCommissionRuleDto {
  @IsOptional()
  @IsEnum(CommissionScope)
  scope?: CommissionScope;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CommissionRuleResponseDto {
  id: string;
  scope: CommissionScope;
  scopeId?: string;
  percentage: number;
  priority: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CommissionCalculationDto {
  ruleId: string;
  percentage: number;
  amount: number;
  scope: CommissionScope;
  scopeId?: string;
}