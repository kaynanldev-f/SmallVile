import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class QueryOrdersDto {
  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filtra por status.' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  // Filtro exclusivo da área administrativa: para o usuário comum ele é
  // ignorado, porque a listagem já é travada no próprio id (ver
  // `OrdersService.findAll`).
  @ApiPropertyOptional({
    description:
      'Filtra os pedidos de um usuário específico. Ignorado quando o requisitante não é administrador.',
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
