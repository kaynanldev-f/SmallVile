import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ForgotPasswordService } from '../services/forgot-password.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { AUTH_MESSAGES } from '../messages/auth.message';
import { ForgotPasswordDto } from '../dtos/email-forgot-password.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Reset Password')
@Controller()
export class ForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  @Throttle({ default: { limit: 5, ttl: 600000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envia link pra resetar senha do usuário',
    description:
      'Endpoint que envia link para resetar senha do usuário na plataforma.',
  })
  @ApiResponse({ status: 200, description: USER_MESSAGES.LINK_SENT })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  async forgotPassword(@Body() forgotPassword: ForgotPasswordDto) {
    await this.forgotPasswordService.sendResetLink(forgotPassword);
    return {
      message: USER_MESSAGES.LINK_SENT,
    };
  }
}
