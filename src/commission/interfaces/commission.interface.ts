export enum CommissionScope {
  GLOBAL = 'GLOBAL',
  CATEGORY = 'CATEGORY',
  VENDOR = 'VENDOR',
  PRODUCT = 'PRODUCT',
}

export interface CommissionRule {
  id: bigint;
  scope: CommissionScope;
  scopeId?: string;
  percentage: number;
  priority: number;
  isActive: boolean;
  createdBy: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionCalculation {
  ruleId: bigint;
  percentage: number;
  amount: number;
  scope: CommissionScope;
  scopeId?: string;
}
