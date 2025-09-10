import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionFrequency } from '../interfaces/subscription.interface';
import { DeliveryAddressDto } from './order.dto';

export class CreateSubscriptionDto {
  @IsUUID()
  product_id: string;

  @IsEnum(SubscriptionFrequency)
  frequency: SubscriptionFrequency;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days?: string[]; // ['mon', 'wed'] for custom frequency

  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  delivery_address?: DeliveryAddressDto;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionFrequency)
  frequency?: SubscriptionFrequency;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsEnum(['active', 'paused', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  delivery_address?: DeliveryAddressDto;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  productId: string;
  vendorId: string;
  frequency: string;
  quantity: number;
  deliveryDays: string[];
  startDate: Date;
  endDate?: Date;
  status: string;
  nextDeliveryDate: Date;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
