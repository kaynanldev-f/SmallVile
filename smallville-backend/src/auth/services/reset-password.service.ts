import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UserService } from 'src/users/service/users.service';
import { UserDocument } from 'src/users/schemas/users.schema';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { USER_MESSAGES } from 'src/users/messages/users.message';

@Injectable()
export class ResetPasswordService {
  constructor(private readonly userService: UserService) {}

  /** Confere o token antes de a tela pedir a senha nova. */
  async validateToken(token: string): Promise<{ valid: true }> {
    await this.findUserByValidToken(token);

    return { valid: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword, confirmNewPassword } = resetPasswordDto;

    if (newPassword !== confirmNewPassword) {
      throw new HttpException(
        { message: USER_MESSAGES.CONFIRM_PASSWORD_MUST_MATCH },
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.findUserByValidToken(token);

    const hashedPassword = await hash(newPassword, 10);

    await this.userService.updateUserPassword(user._id, {
      password: hashedPassword,
      passwordResetToken: null, // Limpa para o token não ser usado de novo
      passwordResetExpires: null,
    });
  }

  /** Usuário dono de um token ainda utilizável. */
  private async findUserByValidToken(token: string): Promise<UserDocument> {
    const invalidToken = new HttpException(
      { message: USER_MESSAGES.INVALID_TOKEN },
      HttpStatus.BAD_REQUEST,
    );

    // Sem isso, um token vazio consultaria o banco à toa — e um dia em que o
    // campo estivesse gravado como "" casaria com qualquer requisição.
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw invalidToken;
    }

    const user = await this.userService.findUserByToken(token.trim());

    if (!user || !user.passwordResetExpires) {
      throw invalidToken;
    }

    if (new Date() > new Date(user.passwordResetExpires)) {
      throw invalidToken;
    }

    return user;
  }
}
