import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { CreateUserDto } from '../../users/dtos/create-user.dto';
import { USER_MESSAGES } from '../../users/messages/users.message';
import { RegisterService } from '../services/register.service';

@ApiTags('Register')
@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastro de novo usuário',
    description: 'Endpoint para cadastro de novo usuário na plataforma.',
  })
  @ApiResponse({ status: 201, description: USER_MESSAGES.REGISTRATION_SUCCESS })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({
    status: 409,
    description: USER_MESSAGES.USER_ALREADY_REGISTERED,
  })
  async registerUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.registerService.register(createUserDto);
    return { message: USER_MESSAGES.REGISTRATION_SUCCESS, data: user };
  }
}
