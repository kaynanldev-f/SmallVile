import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectPaymentDto {
  // Motivo opcional: o pagamento já tem `failureReason`, que é onde a recusa
  // do administrador é gravada.
  @ApiPropertyOptional({
    description:
      'Motivo da recusa, exibido ao usuário nos detalhes do pedido. ' +
      'Quando omitido, o pagamento recebe o motivo padrão da recusa administrativa.',
    example: 'Pagamento não identificado',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'O motivo da recusa deve ser um texto.' })
  @MinLength(3, {
    message: 'O motivo da recusa deve ter ao menos 3 caracteres.',
  })
  @MaxLength(255, {
    message: 'O motivo da recusa deve ter no máximo 255 caracteres.',
  })
  reason?: string;
}
