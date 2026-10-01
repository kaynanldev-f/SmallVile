import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';

const TICKET_PREFIX = 'SMV';
const SIGNATURE_LENGTH = 16;

/** Emissão dos códigos que identificam um ingresso. */
@Injectable()
export class TicketCodeService {
  constructor(private readonly configService: ConfigService) {}

  // Formato: SMV-20260818-9F3AC1B2 (data da emissão + aleatório).
  generateTicketNumber(issuedAt: Date = new Date()): string {
    const datePart = issuedAt.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(4).toString('hex').toUpperCase();

    return `${TICKET_PREFIX}-${datePart}-${randomPart}`;
  }

  buildQrPayload(ticketNumber: string): string {
    return `${ticketNumber}.${this.sign(ticketNumber)}`;
  }

  // Usado na validação do ingresso na portaria: confere se o conteúdo do QR
  // foi realmente emitido por este sistema.
  verifyQrPayload(payload: string): { valid: boolean; ticketNumber?: string } {
    const separatorIndex = payload.lastIndexOf('.');

    if (separatorIndex <= 0) {
      return { valid: false };
    }

    const ticketNumber = payload.slice(0, separatorIndex);
    const signature = payload.slice(separatorIndex + 1);

    if (signature !== this.sign(ticketNumber)) {
      return { valid: false };
    }

    return { valid: true, ticketNumber };
  }

  private sign(ticketNumber: string): string {
    const secret = this.configService.get<string>('TOKEN_SECRET') ?? '';

    return createHmac('sha256', secret)
      .update(ticketNumber)
      .digest('hex')
      .slice(0, SIGNATURE_LENGTH)
      .toUpperCase();
  }
}
