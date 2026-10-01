/**
 * E-mail de redefinição de senha.
 *
 * O usuário não copia mais token nenhum: o botão abre a tela de redefinição
 * já com o token na URL. Por isso o único dado sensível que trafega no link é
 * o próprio token de uso único — nunca senha, hash ou identificador do
 * usuário.
 *
 * O HTML é montado com tabelas e estilo inline de propósito: cliente de
 * e-mail (Gmail, Outlook) descarta `<style>` externo e não entende flexbox.
 * As cores são as mesmas da aplicação (`--color-red-cinema`, `--color-
 * deep-black`, `--color-gray-surface`).
 */

const RED_CINEMA = '#e50914';
const DEEP_BLACK = '#0a0a0a';
const GRAY_SURFACE = '#151515';
const GRAY_BORDER = '#262626';
const TEXT_PRIMARY = '#fafafa';
const TEXT_MUTED = '#a3a3a3';

export interface ResetPasswordEmailData {
  /** Nome do usuário, para o cumprimento. */
  name?: string;
  /** URL completa da tela de redefinição, já com o token. */
  resetUrl: string;
  /** Validade do link, em horas. */
  expiresInHours: number;
}

/** Nada que venha do banco entra no HTML sem escape. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildResetPasswordEmailSubject(): string {
  return 'Redefinição de senha — Smallville Cinemas';
}

/**
 * Versão em texto puro.
 *
 * Vai junto do HTML porque cliente que bloqueia HTML mostraria um e-mail
 * vazio — e aí o usuário ficaria sem o link.
 */
export function buildResetPasswordEmailText(
  data: ResetPasswordEmailData,
): string {
  const greeting = data.name ? `Olá, ${data.name}.` : 'Olá.';

  return [
    'SMALLVILLE CINEMAS',
    '',
    greeting,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta.',
    `Abra o endereço abaixo para cadastrar uma nova senha (o link vale por ${data.expiresInHours} hora(s)):`,
    '',
    data.resetUrl,
    '',
    'Se você não pediu a redefinição, ignore este e-mail: sua senha atual continua valendo e nada foi alterado.',
    '',
    'Este é um e-mail automático — não responda.',
    '© Smallville Cinemas',
  ].join('\n');
}

export function buildResetPasswordEmailHtml(
  data: ResetPasswordEmailData,
): string {
  const greeting = data.name
    ? `Olá, <strong style="color:${TEXT_PRIMARY};">${escapeHtml(data.name)}</strong>.`
    : 'Olá.';

  // A URL entra em href e como texto de apoio; escapada nos dois lugares.
  const safeUrl = escapeHtml(data.resetUrl);

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redefinição de senha</title>
  </head>
  <body style="margin:0;padding:0;background-color:${DEEP_BLACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:${DEEP_BLACK};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="max-width:560px;background-color:${GRAY_SURFACE};border:1px solid ${GRAY_BORDER};border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

            <!-- Cabeçalho -->
            <tr>
              <td style="background-color:${RED_CINEMA};padding:20px 28px;">
                <span style="display:inline-block;font-size:18px;font-weight:bold;letter-spacing:2px;color:#ffffff;">
                  SMALLVILLE
                </span>
                <span style="display:inline-block;font-size:18px;letter-spacing:2px;color:rgba(255,255,255,0.85);">
                  CINEMAS
                </span>
              </td>
            </tr>

            <!-- Conteúdo -->
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:${TEXT_PRIMARY};">
                  Redefinição de senha
                </h1>

                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:${TEXT_MUTED};">
                  ${greeting}
                </p>

                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:${TEXT_MUTED};">
                  Recebemos um pedido para redefinir a senha da sua conta Smallville.
                  Clique no botão abaixo para cadastrar uma nova senha — você não
                  precisa copiar nenhum código.
                </p>
              </td>
            </tr>

            <!-- Botão -->
            <tr>
              <td align="center" style="padding:16px 28px 24px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${RED_CINEMA}" style="border-radius:8px;">
                      <a href="${safeUrl}"
                         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                        Redefinir minha senha
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Link alternativo -->
            <tr>
              <td style="padding:0 28px 24px 28px;">
                <p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:${TEXT_MUTED};">
                  Se o botão não funcionar, copie e cole este endereço no navegador:
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
                  <a href="${safeUrl}" style="color:${RED_CINEMA};text-decoration:underline;">${safeUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Aviso de segurança -->
            <tr>
              <td style="padding:0 28px 28px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="background-color:${DEEP_BLACK};border:1px solid ${GRAY_BORDER};border-left:3px solid ${RED_CINEMA};border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:${TEXT_PRIMARY};">
                        Aviso de segurança
                      </p>
                      <p style="margin:0;font-size:13px;line-height:1.6;color:${TEXT_MUTED};">
                        O link vale por <strong style="color:${TEXT_PRIMARY};">${data.expiresInHours} hora(s)</strong>
                        e só pode ser usado uma vez. Se você não pediu esta redefinição,
                        ignore este e-mail: sua senha atual continua valendo e nada foi
                        alterado. Nunca compartilhe este link com outra pessoa.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Rodapé -->
            <tr>
              <td style="background-color:${DEEP_BLACK};border-top:1px solid ${GRAY_BORDER};padding:18px 28px;">
                <p style="margin:0 0 4px 0;font-size:12px;line-height:1.5;color:${TEXT_MUTED};">
                  Este é um e-mail automático — por favor, não responda.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#525252;">
                  &copy; Smallville Cinemas
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
