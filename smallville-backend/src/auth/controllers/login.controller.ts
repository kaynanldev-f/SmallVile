import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { LoginDto } from 'src/auth/dtos/login.dto';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { LoginService } from '../services/login.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Throttle({ default: { limit: 5, ttl: 600000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticação do usuário e retorno do token' })
  @ApiResponse({
    status: 200,
    description: AUTH_MESSAGES.AUTHORIZED,
  })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 429, description: AUTH_MESSAGES.TOO_MANY_REQUESTS })
  async login(@Body() loginDto: LoginDto) {
    const data = await this.loginService.login(loginDto);

    return { message: USER_MESSAGES.LOGIN_SUCCESS, data };
  }
}
