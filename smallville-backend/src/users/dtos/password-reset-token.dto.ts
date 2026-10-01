import { IsDate, IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { USER_MESSAGES } from 'src/users/messages/users.message';

export class PasswordResetTokenDto {
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Email') })
  @IsEmail({}, { message: USER_MESSAGES.EMAIL_INVALID_FORMAT })
  email: string;

  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Token') })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Token') })
  token: string;

  @IsDate()
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Expires') })
  expires: Date;
}
