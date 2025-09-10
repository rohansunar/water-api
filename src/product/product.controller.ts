import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
  ParseFloatPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductResponseDto } from '../common/dto/product.dto';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @Get('vendors/:location/products')
  async getProductsByLocation(
    @Param('location') location: string,
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
  ): Promise<ProductResponseDto[]> {
    this.logger.log(
      `Getting products for location: ${location} (${lat}, ${lng})`,
    );
    return this.productService.findByLocation(lat, lng);
  }

  @Get('products/:productId')
  async getProductDetails(
    @Param('productId') productId: string,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Getting product details for: ${productId}`);
    return this.productService.getProductDetails(productId);
  }
}
