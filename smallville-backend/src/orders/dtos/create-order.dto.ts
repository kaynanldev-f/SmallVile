import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketType } from 'src/tickets/enums/ticket-type.enum';

class OrderSeatDto {
  @ApiProperty({ example: 'A3' })
  @IsString()
  @IsNotEmpty()
  seatNumber: string;

  @ApiProperty({ enum: TicketType, example: TicketType.FULL })
  @IsEnum(TicketType, { message: 'Tipo de ingresso inválido.' })
  type: TicketType;
}

export class CreateOrderDto {
  @ApiProperty({ example: '6a5996f2f0659d3441f13ebe' })
  @IsMongoId({ message: 'ID da sessão inválido.' })
  sessionId: string;

  @ApiProperty({ type: [OrderSeatDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione ao menos um assento.' })
  @ValidateNested({ each: true })
  @Type(() => OrderSeatDto)
  seats: OrderSeatDto[];
}
