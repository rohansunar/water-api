import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { StoreService } from '../services/store.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoreController {
  private readonly logger = new Logger(StoreController.name);

  constructor(private readonly storeService: StoreService) {}

  @Get(':id')
  async getStoreDetails(@Param('id') storeId: string): Promise<any> {
    this.logger.log(`Getting store details for: ${storeId}`);
    return this.storeService.getStoreDetails(storeId);
  }
}
