import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';
import { AuthController } from './controllers/auth.controller';
import { RegisterService } from './services/register.service';
import { LoginService } from './services/login.service';
import { UsersModule } from 'src/users/users.module';
import { ResetPasswordService } from './services/reset-password.service';
import { RegisterController } from './controllers/register.controller';
import { LoginController } from './controllers/login.controller';
import { ResetPasswordController } from './controllers/reset-password.controller';
import { ForgotPasswordController } from './controllers/forgot-password.controller';
import { ForgotPasswordService } from './services/forgot-password.service';
import { SeedService } from 'src/seed/seed-admin.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('TOKEN_SECRET');
        const expiresIn = configService.get<string>('TOKEN_EXPIRATION');

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as SignOptions['expiresIn'],
          },
        };
      },
    }),
  ],

  controllers: [
    AuthController,
    RegisterController,
    LoginController,
    ResetPasswordController,
    ForgotPasswordController,
  ],
  providers: [
    AuthService,
    RegisterService,
    LoginService,
    ResetPasswordService,
    ForgotPasswordService,
    SeedService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
