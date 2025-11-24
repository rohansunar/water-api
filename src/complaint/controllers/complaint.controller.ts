import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ComplaintService } from '../services/complaint.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../common/interfaces/user.interface';
import { CreateComplaintDto, ComplaintResponseDto } from '../dto/complaint.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard)
@ApiTags('Complaints')
@ApiBearerAuth()
export class ComplaintController {
  private readonly logger = new Logger(ComplaintController.name);

  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @ApiOperation({ summary: 'Create complaint', description: 'Create a new complaint' })
  @ApiBody({ type: CreateComplaintDto })
  @ApiResponse({ status: 201, description: 'Complaint created successfully', type: ComplaintResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get user complaints', description: 'Retrieve all complaints for the current user' })
  @ApiResponse({ status: 200, description: 'Complaints retrieved successfully', type: [ComplaintResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserComplaints(
    @CurrentUser() user: User,
  ): Promise<ComplaintResponseDto[]> {
    this.logger.log(`Getting complaints for user: ${user.id}`);
    return this.complaintService.getUserComplaints(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complaint by ID', description: 'Retrieve a specific complaint by its ID' })
  @ApiParam({ name: 'id', description: 'Complaint ID', type: String })
  @ApiResponse({ status: 200, description: 'Complaint retrieved successfully', type: ComplaintResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Complaint not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getComplaintById(
    @Param('id') complaintId: string,
    @CurrentUser() user: User,
  ): Promise<ComplaintResponseDto> {
    this.logger.log(`Getting complaint ${complaintId} for user: ${user.id}`);
    return this.complaintService.getComplaintById(complaintId, user.id);
  }
}
