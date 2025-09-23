import { Controller, Get, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../common/interfaces/user.interface';
import { UserProfileDto } from '../common/dto/auth.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: User): Promise<UserProfileDto> {
    this.logger.log(`Getting profile for user: ${user.id}`);
    return this.userService.getUserProfile(user.id);
  }

  @Put('monthly-payment-mode')
  async updateMonthlyPaymentMode(
    @CurrentUser() user: User,
    @Body() updateDto: { monthlyPaymentMode: boolean },
  ): Promise<{ message: string; monthlyPaymentMode: boolean }> {
    this.logger.log(
      `Updating monthly payment mode for user: ${user.id} to ${updateDto.monthlyPaymentMode}`,
    );
    await this.userService.updateMonthlyPaymentMode(
      user.id,
      updateDto.monthlyPaymentMode,
    );
    return {
      message: 'Monthly payment mode updated successfully',
      monthlyPaymentMode: updateDto.monthlyPaymentMode,
    };
  }
}
