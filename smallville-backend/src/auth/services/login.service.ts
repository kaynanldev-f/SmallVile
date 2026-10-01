import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/services/auth.service';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { LoginDto } from '../dtos/login.dto';
import { UserService } from 'src/users/service/users.service';

@Injectable()
export class LoginService {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException({
        message: USER_MESSAGES.EMAIL_OR_PASSWORD_INCORRECT,
      });
    }

    const passwordMatch = await bcrypt.compare(password.trim(), user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException({
        message: USER_MESSAGES.EMAIL_OR_PASSWORD_INCORRECT,
      });
    }

    const data = this.authService.generateToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
    });

    return data;
  }
}
