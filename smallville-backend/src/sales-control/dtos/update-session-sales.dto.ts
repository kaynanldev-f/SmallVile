import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';

/** Controle de venda de uma sessão específica. */
export class UpdateSessionSalesDto {
  @ApiPropertyOptional({
    description:
      'Habilita ou encerra a venda desta sessão. Com `false`, nenhum pedido novo é aceito.',
  })
  @IsOptional()
  @IsBoolean({ message: 'O status de venda deve ser verdadeiro ou falso.' })
  salesEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Início do período de vendas (ISO 8601). `null` remove.',
    example: '2026-08-18T10:00:00.000Z',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Date)
  @IsDate({ message: 'Data de início das vendas inválida.' })
  salesStartAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Fim do período de vendas (ISO 8601). `null` remove.',
    example: '2026-08-25T18:00:00.000Z',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Date)
  @IsDate({ message: 'Data de término das vendas inválida.' })
  salesEndAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'Preço da inteira só desta sessão, em centavos. `null` volta a usar a tabela de preços.',
    example: 3500,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: 'O preço da inteira deve ser informado em centavos.' })
  @Min(1, {
    message:
      'Informe o preço da inteira em centavos (maior que zero), ou `null` para usar a tabela.',
  })
  priceFull?: number | null;

  @ApiPropertyOptional({
    description:
      'Preço da meia só desta sessão, em centavos. `null` volta a usar a tabela de preços.',
    example: 1750,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: 'O preço da meia deve ser informado em centavos.' })
  @Min(1, {
    message:
      'Informe o preço da meia em centavos (maior que zero), ou `null` para usar a tabela.',
  })
  priceHalf?: number | null;
}
