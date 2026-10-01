import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ValidateResetTokenDto } from '../dtos/validate-reset-token.dto';
import { ResetPasswordService } from '../services/reset-password.service';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Reset Password')
@Controller('reset-password')
export class ResetPasswordController {
  constructor(private readonly resetPasswordService: ResetPasswordService) {}

  /**
   * Consulta feita pela tela de redefinição ao abrir pelo link do e-mail.
   */
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @Get('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verifica se um token de redefinição ainda é válido',
    description:
      'Usado pela tela de redefinição ao abrir o link do e-mail. Não devolve nenhum dado do usuário.',
  })
  @ApiQuery({ name: 'token', type: String, required: true })
  @ApiResponse({ status: 200, description: USER_MESSAGES.VALID_TOKEN })
  @ApiResponse({ status: 400, description: USER_MESSAGES.INVALID_TOKEN })
  async validateToken(@Query() query: ValidateResetTokenDto) {
    const data = await this.resetPasswordService.validateToken(query.token);

    return { message: USER_MESSAGES.VALID_TOKEN, data };
  }

  @Throttle({ default: { limit: 5, ttl: 600000 } })
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reseta a senha do usuário usando o token recebido por e-mail',
    description:
      'O token chega pela URL do link enviado por e-mail; a tela apenas o repassa junto da nova senha.',
  })
  @ApiResponse({ status: 200, description: USER_MESSAGES.PASSWORD_CHANGED })
  @ApiResponse({
    status: 400,
    description: USER_MESSAGES.INVALID_TOKEN,
  })
  async resetUserPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.resetPasswordService.resetPassword(resetPasswordDto);
    return { message: USER_MESSAGES.PASSWORD_CHANGED };
  }
}
