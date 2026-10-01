import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export interface MockPixData {
  qrCode: string;
  copyPasteCode: string;
  expiresAt: Date;
}

export interface MockChargeResult {
  gatewayReference: string;
  pix?: MockPixData;
}

// Gateway de pagamento MOCKADO — não se comunica com nenhum provedor real.
@Injectable()
export class MockPaymentGatewayService {
  private readonly logger = new Logger(MockPaymentGatewayService.name);

  // Configurações do mock — ajustáveis conforme a necessidade dos testes.
  private readonly PIX_EXPIRATION_MINUTES = 15;
  private readonly CARD_PROCESSING_DELAY_MS = 2500;
  private readonly CARD_APPROVAL_RATE = 0.85;

  // Simula falha de comunicação com o gateway em uma pequena % dos casos,
  // para permitir testar a mensagem de erro correspondente.
  private readonly GATEWAY_COMMUNICATION_FAILURE_RATE = 0.03;

  // Etapa 1: criação do pagamento no gateway.
  createCharge(method: PaymentMethod, amountInCents: number): MockChargeResult {
    if (Math.random() < this.GATEWAY_COMMUNICATION_FAILURE_RATE) {
      throw new Error('MOCK_GATEWAY_COMMUNICATION_FAILURE');
    }

    const gatewayReference = `MOCK-${randomUUID()}`;

    if (method !== PaymentMethod.PIX) {
      return { gatewayReference };
    }

    const expiresAt = new Date(
      Date.now() + this.PIX_EXPIRATION_MINUTES * 60_000,
    );

    return {
      gatewayReference,
      pix: {
        qrCode: this.buildMockQrCode(gatewayReference, amountInCents),
        copyPasteCode: this.buildMockCopyPasteCode(
          gatewayReference,
          amountInCents,
        ),
        expiresAt,
      },
    };
  }

  // Etapa 2: processamento assíncrono simulado para Cartão de
  // Crédito/Débito.
  simulateCardProcessing(
    onResolved: (
      status: PaymentStatus.APPROVED | PaymentStatus.REFUSED,
      reason?: string,
    ) => void | Promise<void>,
  ): void {
    setTimeout(() => {
      const approved = Math.random() < this.CARD_APPROVAL_RATE;

      Promise.resolve(
        onResolved(
          approved ? PaymentStatus.APPROVED : PaymentStatus.REFUSED,
          approved
            ? undefined
            : 'Pagamento recusado pela operadora do cartão (simulação).',
        ),
      ).catch((error: unknown) =>
        this.logger.error(
          'Falha ao processar callback do mock de pagamento',
          error instanceof Error ? error.stack : undefined,
        ),
      );
    }, this.CARD_PROCESSING_DELAY_MS);
  }

  // Etapa 3 (PIX): em um gateway real, a confirmação chegaria via webhook
  // quando o pagador escaneasse o QR Code e pagasse.
  confirmPixPayment(): PaymentStatus.APPROVED {
    return PaymentStatus.APPROVED;
  }

  private buildMockQrCode(reference: string, amountInCents: number): string {
    // Payload fake em base64 — apenas para exibição/simulação visual do
    // QR Code na tela, sem validade real perante qualquer PSP.
    return Buffer.from(
      `00020126MOCKPIX|ref=${reference}|amount=${amountInCents}`,
    ).toString('base64');
  }

  private buildMockCopyPasteCode(
    reference: string,
    amountInCents: number,
  ): string {
    return `PIXCOPIAECOLA|${reference}|${amountInCents}`;
  }
}
