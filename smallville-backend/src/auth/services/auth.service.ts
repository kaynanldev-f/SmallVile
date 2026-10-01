import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from 'src/users/enums/user-roles.enum';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(user: {
    userId: string;
    email: string;
    name: string;
    surname: string;
    role: UserRole;
  }) {
    const payload = {
      sub: user.userId,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    return { token };
  }
}
