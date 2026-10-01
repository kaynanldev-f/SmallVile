import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '../enums/ticket-status.enum';

export class QueryTicketsDto {
  @ApiPropertyOptional({
    enum: TicketStatus,
    description: 'Filtra por status.',
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Filtra os ingressos de uma sessão.',
    example: '667f123abc456def78901234',
  })
  @IsOptional()
  @IsMongoId()
  sessionId?: string;

  // Filtro da área administrativa: ignorado quando o requisitante não é
  // administrador, já que a listagem do usuário comum é travada no próprio
  // id (ver `TicketsService.findAllForRequester`).
  @ApiPropertyOptional({
    description:
      'Filtra os ingressos de um usuário. Ignorado quando o requisitante não é administrador.',
    example: '667f123abc456def78901234',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
