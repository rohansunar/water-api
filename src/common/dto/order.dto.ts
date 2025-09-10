import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  IsPhoneNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OrderSchedule, PaymentMethod } from '../interfaces/order.interface';
import {
  IsValidUUID,
  IsValidQuantity,
  IsValidAmount,
  IsValidPincode,
  IsValidLatitude,
  IsValidLongitude,
} from '../decorators/validation.decorators';

export class DeliveryAddressDto {
  @IsString({ message: 'Street address must be a string' })
  @IsNotEmpty({ message: 'Street address is required' })
  @Transform(({ value }) => value?.toString().trim())
  street: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @Transform(({ value }) => value?.toString().trim())
  city: string;

  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State is required' })
  @Transform(({ value }) => value?.toString().trim())
  state: string;

  @IsString({ message: 'Pincode must be a string' })
  @IsNotEmpty({ message: 'Pincode is required' })
  @IsValidPincode({ message: 'Please provide a valid 6-digit pincode' })
  @Transform(({ value }) => value?.toString().trim())
  pincode: string;

  @IsOptional()
  @IsString({ message: 'Landmark must be a string' })
  @Transform(({ value }) => value?.toString().trim())
  landmark?: string;

  @IsNumber({}, { message: 'Latitude must be a number' })
  @IsValidLatitude({ message: 'Please provide a valid latitude' })
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a number' })
  @IsValidLongitude({ message: 'Please provide a valid longitude' })
  longitude: number;

  @IsString({ message: 'Contact phone must be a string' })
  @IsNotEmpty({ message: 'Contact phone is required' })
  @IsPhoneNumber('IN', {
    message: 'Please provide a valid Indian phone number',
  })
  @Transform(({ value }) => value?.toString().trim())
  contactPhone: string;
}

export class CreateOrderDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(OrderSchedule)
  schedule: OrderSchedule;

  @IsOptional()
  @IsDateString()
  delivery_time?: string;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  delivery_address?: DeliveryAddressDto;
}

export class UpdateOrderStatusDto {
  @IsEnum(['picked', 'in_transit', 'delivered'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderResponseDto {
  id: string;
  userId: string;
  vendorId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  schedule: string;
  deliveryTime?: Date;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: DeliveryAddressDto;
  createdAt: Date;
  updatedAt: Date;
}
