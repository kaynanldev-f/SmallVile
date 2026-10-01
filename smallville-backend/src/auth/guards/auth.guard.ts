import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AUTH_MESSAGES } from '../messages/auth.message';
import { UserRole } from 'src/users/enums/user-roles.enum';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  surname: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user: {
    sub: string;
    email: string;
    name: string;
    surname: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        message: AUTH_MESSAGES.UNAUTHORIZED,
      });
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      request.user = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        surname: payload.surname,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException({
        message: AUTH_MESSAGES.UNAUTHORIZED,
      });
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    return request.headers.authorization?.split(' ')[1] ?? null;
  }
}
