import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../common/interfaces/user.interface';
import { TopupWalletDto, WalletResponseDto } from '../../common/dto/wallet.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@CurrentUser() user: User): Promise<WalletResponseDto> {
    this.logger.log(`Getting wallet for user: ${user.id}`);
    return this.walletService.getWallet(user.id);
  }

  @Post('topup')
  async topupWallet(
    @CurrentUser() user: User,
    @Body() topupDto: TopupWalletDto,
  ): Promise<{ message: string; transactionId: string }> {
    this.logger.log(
      `Wallet topup request for user: ${user.id}, amount: ₹${topupDto.amount}`,
    );
    return this.walletService.topupWallet(user.id, topupDto);
  }
}
