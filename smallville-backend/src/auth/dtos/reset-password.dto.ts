import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';
import { USER_MESSAGES } from 'src/users/messages/users.message';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token Recebido pelo email',
    example: 'token-recebido-pelo-email',
  })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Token') })
  token: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'Senha123@',
  })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Nova senha') })
  @MinLength(6, { message: USER_MESSAGES.PASSWORD_MIN_LENGTH })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmar nova senha do usuário',
    example: 'Senha123@',
  })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Confirmar senha') })
  confirmNewPassword: string;
}
