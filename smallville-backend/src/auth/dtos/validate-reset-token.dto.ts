import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { USER_MESSAGES } from 'src/users/messages/users.message';

/** Token de redefinição lido da URL do link enviado por e-mail. */
export class ValidateResetTokenDto {
  @ApiProperty({
    description: 'Token recebido no link do e-mail.',
    example: 'a3f1c0b2d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f',
  })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Token') })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Token') })
  @Length(32, 128, { message: USER_MESSAGES.INVALID_TOKEN })
  @Matches(/^[a-f0-9]+$/i, { message: USER_MESSAGES.INVALID_TOKEN })
  token: string;
}
