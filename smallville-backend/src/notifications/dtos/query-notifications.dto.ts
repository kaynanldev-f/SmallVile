import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { NotificationAudience } from '../enums/notification-audience.enum';

export class QueryNotificationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: NotificationAudience,
    description:
      'Caixa a ser listada. O padrão é `usuario`; `administrador` é exclusivo do painel e só o admin pode consultar.',
  })
  @IsOptional()
  @IsEnum(NotificationAudience, { message: 'Público da notificação inválido.' })
  audience?: NotificationAudience;

  @ApiPropertyOptional({
    description:
      'Filtra por lidas (`true`) ou não lidas (`false`). Sem o filtro, as duas são retornadas.',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }): unknown => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O filtro de leitura deve ser verdadeiro ou falso.' })
  read?: boolean;
}
