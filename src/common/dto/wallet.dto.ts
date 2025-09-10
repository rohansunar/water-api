import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class TopupWalletDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  payment_method: string;
}

export class WalletResponseDto {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  transactions: WalletTransactionDto[];
}

export class WalletTransactionDto {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  status: string;
  createdAt: Date;
}
