import { ConfigService } from '@nestjs/config';
import { TicketCodeService } from './ticket-code.service';

describe('TicketCodeService (Unitário)', () => {
  const configService = {
    get: jest.fn().mockReturnValue('segredo-de-teste'),
  } as unknown as ConfigService;

  const service = new TicketCodeService(configService);

  describe('generateTicketNumber', () => {
    it('deve seguir o formato SMV-AAAAMMDD-XXXXXXXX', () => {
      const number = service.generateTicketNumber(
        new Date('2026-08-18T10:00:00.000Z'),
      );

      expect(number).toMatch(/^SMV-20260818-[0-9A-F]{8}$/);
    });

    it('deve gerar um número diferente a cada emissão', () => {
      const numbers = new Set(
        Array.from({ length: 50 }, () => service.generateTicketNumber()),
      );

      expect(numbers.size).toBe(50);
    });
  });

  describe('QR Code', () => {
    it('deve validar um payload emitido pelo próprio sistema', () => {
      const ticketNumber = service.generateTicketNumber();
      const payload = service.buildQrPayload(ticketNumber);

      expect(service.verifyQrPayload(payload)).toEqual({
        valid: true,
        ticketNumber,
      });
    });

    it('deve recusar um payload com assinatura adulterada', () => {
      const payload = service.buildQrPayload(service.generateTicketNumber());
      const forged = `${payload.split('.')[0]}.0000000000000000`;

      expect(service.verifyQrPayload(forged).valid).toBe(false);
    });

    it('deve recusar um número de ingresso trocado, mantendo a assinatura', () => {
      const payload = service.buildQrPayload('SMV-20260818-AAAAAAAA');
      const signature = payload.split('.')[1];

      expect(
        service.verifyQrPayload(`SMV-20260818-BBBBBBBB.${signature}`).valid,
      ).toBe(false);
    });

    it('deve recusar um payload sem assinatura', () => {
      expect(service.verifyQrPayload('SMV-20260818-AAAAAAAA').valid).toBe(
        false,
      );
    });
  });
});
