import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Recusa de uma solicitação de reembolso. */
export class RejectRefundDto {
  @ApiProperty({
    description: 'Motivo da recusa, informado ao usuário.',
    example: 'A sessão já foi realizada e o ingresso foi utilizado.',
    minLength: 3,
    maxLength: 500,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O motivo da recusa deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe o motivo da recusa do reembolso.' })
  @MinLength(3, {
    message: 'O motivo da recusa deve ter ao menos 3 caracteres.',
  })
  @MaxLength(500, {
    message: 'O motivo da recusa deve ter no máximo 500 caracteres.',
  })
  resolutionReason: string;
}
