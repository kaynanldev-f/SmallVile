import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketType } from '../enums/ticket-type.enum';
import { TICKETS_MESSAGES } from '../messages/tickets.message';

export class CreateTicketDto {
  @ApiProperty({
    description: 'ID da sessão de cinema',
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @IsMongoId({ message: TICKETS_MESSAGES.FIELD_IS_MONGO_ID('sessionId') })
  @IsNotEmpty({ message: TICKETS_MESSAGES.FIELD_REQUIRED('sessionId') })
  sessionId: string;

  @ApiProperty({
    description: 'Número do assento escolhido',
    example: 'A25',
  })
  @IsString()
  @IsNotEmpty({ message: TICKETS_MESSAGES.FIELD_REQUIRED('Número do assento') })
  @Length(2, 3, {
    message: TICKETS_MESSAGES.FIELD_LENGTH_BETWEEN('Número do assento', 2, 3),
  })
  @Matches(/^[A-Za-z]\d{1,2}$/, {
    message: TICKETS_MESSAGES.FIELD_INVALID_FORMAT(
      'Número do assento',
      'uma letra seguida de 1 ou 2 números (Ex: A25)',
    ),
  })
  seatNumber: string;

  @ApiProperty({
    description: 'Tipo do ingresso (INTEIRA ou MEIA)',
    enum: TicketType,
    example: TicketType.HALF,
  })
  @IsEnum(TicketType, {
    message: 'Tipo de ingresso inválido. Use INTEIRA ou MEIA.',
  })
  @IsNotEmpty({ message: TICKETS_MESSAGES.FIELD_REQUIRED('type') })
  type: TicketType;
}
