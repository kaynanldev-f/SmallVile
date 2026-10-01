import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { USER_MESSAGES } from 'src/users/messages/users.message';

export class LoginDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'email@dominio.com',
  })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Email') })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Teste123@',
  })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Senha') })
  password: string;
}
