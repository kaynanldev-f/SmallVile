import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AnalyticsPeriod } from '../enums/analytics-period.enum';

/** Filtro único do dashboard. */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.LAST_30_DAYS,
    description:
      'Atalho de período. Use `personalizado` junto de `from` e `to` para um intervalo próprio.',
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod, { message: 'Período inválido.' })
  period?: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS;

  @ApiPropertyOptional({
    description: 'Início do período personalizado (ISO 8601).',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data inicial inválida.' })
  from?: Date;

  @ApiPropertyOptional({
    description: 'Fim do período personalizado (ISO 8601).',
    example: '2026-08-18T23:59:59.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data final inválida.' })
  to?: Date;

  @ApiPropertyOptional({
    description: 'Tamanho dos rankings (filmes, cinemas, produtos).',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser no mínimo 1.' })
  @Max(50, { message: 'O limite deve ser no máximo 50.' })
  limit?: number = 10;
}
