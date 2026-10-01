import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/users/service/users.service';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { ForgotPasswordDto } from '../dtos/email-forgot-password.dto';
import {
  buildResetPasswordEmailHtml,
  buildResetPasswordEmailSubject,
  buildResetPasswordEmailText,
} from '../templates/reset-password-email';

/** Validade do link, em horas. É a mesma janela que o serviço já usava. */
export const RESET_TOKEN_EXPIRATION_HOURS = 1;

/** Caminho da tela de redefinição no frontend. */
const RESET_PASSWORD_PATH = '/reset-password';

/* const DEFAULT_FRONTEND_URL_DEV = 'http://localhost:3000'; */
const DEFAULT_FRONTEND_URL_PROD = 'http://smallville.qacoders.dev.br';

@Injectable()
export class ForgotPasswordService {
  private readonly logger = new Logger(ForgotPasswordService.name);

  constructor(
    private readonly userService: UserService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendResetLink(forgotPassword: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPassword;

    const user = await this.userService.findUserByEmail(email);

    // Silêncio proposital: responder diferente para e-mail inexistente
    // transformaria a rota em um verificador de cadastro.
    if (!user || user.role === UserRole.ADMIN) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + RESET_TOKEN_EXPIRATION_HOURS);

    await this.userService.setPasswordResetToken({
      email,
      token,
      expires,
    });

    const resetUrl = this.buildResetUrl(token);

    const emailData = {
      name: user.name,
      resetUrl,
      expiresInHours: RESET_TOKEN_EXPIRATION_HOURS,
    };

    await this.mailerService.sendMail({
      to: email,
      subject: buildResetPasswordEmailSubject(),
      html: buildResetPasswordEmailHtml(emailData),
      text: buildResetPasswordEmailText(emailData),
    });
  }

  /**
   * Link do e-mail: a tela de redefinição do frontend com o token na query.
   */
  private buildResetUrl(token: string): string {
    const configured = this.configService.get<string>('FRONTEND_URL');

    if (!configured) {
      this.logger.warn(
        `FRONTEND_URL não configurada: o link de redefinição de senha vai apontar para ${DEFAULT_FRONTEND_URL_PROD}.`,
      );
    }

    const base = (configured || DEFAULT_FRONTEND_URL_PROD).replace(/\/+$/, '');

    const url = new URL(`${base}${RESET_PASSWORD_PATH}`);
    url.searchParams.set('token', token);

    return url.toString();
  }
}
