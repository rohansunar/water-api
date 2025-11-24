import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { StoreService } from '../services/store.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('stores')
@UseGuards(JwtAuthGuard)
@ApiTags('Vendors')
@ApiBearerAuth()
export class StoreController {
  private readonly logger = new Logger(StoreController.name);

  constructor(private readonly storeService: StoreService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get store details', description: 'Retrieve details of a specific store' })
  @ApiParam({ name: 'id', description: 'Store ID', type: String })
  @ApiResponse({ status: 200, description: 'Store details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getStoreDetails(@Param('id') storeId: string): Promise<any> {
    this.logger.log(`Getting store details for: ${storeId}`);
    return this.storeService.getStoreDetails(storeId);
  }
}
