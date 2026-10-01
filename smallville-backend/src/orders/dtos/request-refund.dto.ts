import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestRefundDto {
  @ApiPropertyOptional({
    description:
      'Motivo da solicitação, informado pelo usuário. Fica registrado no pedido e é exibido ao administrador na análise.',
    example: 'Não vou conseguir comparecer à sessão.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'O motivo deve ser um texto.' })
  @MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres.' })
  reason?: string;
}
