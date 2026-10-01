import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

/** Situações que a tela de reembolsos filtra. */
export enum RefundStatusFilter {
  REQUESTED = OrderStatus.REFUND_REQUESTED,
  APPROVED = OrderStatus.REFUND_APPROVED,
  REJECTED = OrderStatus.REFUND_REJECTED,
}

export class QueryRefundsDto {
  @ApiPropertyOptional({
    enum: RefundStatusFilter,
    description:
      'Filtra pela situação da solicitação. Sem filtro, retorna solicitações em análise, aprovadas e recusadas.',
  })
  @IsOptional()
  @IsEnum(RefundStatusFilter, {
    message: 'Situação de reembolso inválida.',
  })
  status?: RefundStatusFilter;

  @ApiPropertyOptional({
    description: 'Filtra as solicitações de um usuário específico.',
    example: '667f123abc456def78901234',
  })
  @IsOptional()
  @IsMongoId({ message: 'O id do usuário é inválido.' })
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
