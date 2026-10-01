import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Aprovação de uma solicitação de reembolso. */
export class ApproveRefundDto {
  @ApiPropertyOptional({
    description:
      'Observação da decisão, exibida no histórico da solicitação. Opcional na aprovação.',
    example: 'Sessão cancelada pelo cinema.',
    minLength: 3,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'A observação da decisão deve ser um texto.' })
  @MinLength(3, {
    message: 'A observação da decisão deve ter ao menos 3 caracteres.',
  })
  @MaxLength(500, {
    message: 'A observação da decisão deve ter no máximo 500 caracteres.',
  })
  resolutionReason?: string;
}
