import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { USER_MESSAGES } from 'src/users/messages/users.message';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email do usuário para receber o link',
    example: 'email@dominio.com',
  })
  @IsEmail({}, { message: USER_MESSAGES.EMAIL_INVALID_FORMAT })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Email') })
  email: string;
}
