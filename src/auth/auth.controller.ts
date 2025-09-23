import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  VerifyOtpDto,
  AuthResponseDto,
} from '../common/dto/auth.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
@Public()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ message: string; success: boolean }> {
    this.logger.log(`Login attempt for phone: ${loginDto.phone}`);
    return this.authService.login(loginDto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    this.logger.log(
      `OTP verification attempt for phone: ${verifyOtpDto.phone}`,
    );
    return this.authService.verifyOtp(verifyOtpDto);
  }
}
