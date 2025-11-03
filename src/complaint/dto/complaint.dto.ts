import { IsString, IsEnum, IsOptional, IsUUID, IsArray } from 'class-validator';
import { ComplaintType } from '../../complaint/interfaces/complaint.interface';
import { PaginationQueryDto } from '../../common/utils/pagination.util';

export class CreateComplaintDto {
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @IsOptional()
  @IsUUID()
  subscription_id?: string;

  @IsEnum(ComplaintType)
  type: ComplaintType;

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class ComplaintResponseDto {
  id: string;
  userId: string;
  orderId?: string;
  subscriptionId?: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  resolution?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export class ComplaintListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ComplaintType)
  type?: ComplaintType;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
