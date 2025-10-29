import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ComplaintService } from '../services/complaint.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../common/interfaces/user.interface';
import {
  CreateComplaintDto,
  ComplaintResponseDto,
} from '../../common/dto/complaint.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard)
export class ComplaintController {
  private readonly logger = new Logger(ComplaintController.name);

  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  async createComplaint(
    @CurrentUser() user: User,
    @Body() createComplaintDto: CreateComplaintDto,
  ): Promise<ComplaintResponseDto> {
    this.logger.log(
      `Creating complaint for user: ${user.id}, subject: ${createComplaintDto.subject}`,
    );
    return this.complaintService.createComplaint(user.id, createComplaintDto);
  }

  @Get()
  async getUserComplaints(
    @CurrentUser() user: User,
  ): Promise<ComplaintResponseDto[]> {
    this.logger.log(`Getting complaints for user: ${user.id}`);
    return this.complaintService.getUserComplaints(user.id);
  }

  @Get(':id')
  async getComplaintById(
    @Param('id') complaintId: string,
    @CurrentUser() user: User,
  ): Promise<ComplaintResponseDto> {
    this.logger.log(`Getting complaint ${complaintId} for user: ${user.id}`);
    return this.complaintService.getComplaintById(complaintId, user.id);
  }
}
