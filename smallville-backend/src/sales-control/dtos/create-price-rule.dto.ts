import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePriceRuleDto {
  @ApiProperty({
    description: 'Nome da regra, exibido na tela de controle de vendas.',
    example: 'Sexta-feira',
  })
  @IsString({ message: 'O nome da regra deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe um nome para a regra de preço.' })
  @MaxLength(60, { message: 'O nome da regra deve ter até 60 caracteres.' })
  name: string;

  @ApiPropertyOptional({
    description:
      'Dia da semana (0 = domingo ... 6 = sábado). Omita ou envie `null` para valer todos os dias.',
    example: 5,
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: 'O dia da semana deve ser um número de 0 a 6.' })
  @Min(0, { message: 'O dia da semana deve ser um número de 0 a 6.' })
  @Max(6, { message: 'O dia da semana deve ser um número de 0 a 6.' })
  weekday?: number | null;

  @ApiPropertyOptional({
    description:
      'Cinema ao qual a regra se aplica. Omita ou envie `null` para valer para toda a rede.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsMongoId({ message: 'ID do cinema inválido.' })
  cinemaId?: string | null;

  /** O mínimo é 1 centavo, e não 0, de propósito. */
  @ApiProperty({
    description: 'Preço da inteira, em centavos. Mínimo de 1 centavo.',
    example: 3000,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'O preço da inteira deve ser informado em centavos.' })
  @Min(1, {
    message:
      'Informe o preço da inteira em centavos (maior que zero). Ex.: 3000 para R$ 30,00.',
  })
  fullPrice: number;

  @ApiProperty({
    description: 'Preço da meia-entrada, em centavos. Mínimo de 1 centavo.',
    example: 1500,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'O preço da meia deve ser informado em centavos.' })
  @Min(1, {
    message:
      'Informe o preço da meia em centavos (maior que zero). Ex.: 1500 para R$ 15,00.',
  })
  halfPrice: number;

  @ApiPropertyOptional({
    description: 'Regra ativa. Uma regra inativa é ignorada no cálculo.',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo ativo deve ser verdadeiro ou falso.' })
  active?: boolean;
}
