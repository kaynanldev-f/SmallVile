import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SeatType } from '../enums/seat-type.enum';
import { SESSION_MESSAGES } from '../messages/sessions.messages';

export class SeatDto {
  @ApiProperty({
    description: 'Identificador único do assento na sala (Fileira + Número)',
    example: 'A1',
    type: String,
  })
  @IsString({ message: SESSION_MESSAGES.FIELD_IS_STRING('Número do assento') })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Número do assento') })
  @Matches(/^[A-Za-z]\d{1,2}$/, {
    message: SESSION_MESSAGES.FIELD_INVALID_FORMAT(
      'Número do assento',
      'uma letra seguida de 1 ou 2 números (Ex: A25)',
    ),
  })
  seatNumber: string;

  @ApiProperty({
    description: 'Tipo de acomodação do assento',
    enum: SeatType,
    example: SeatType.COMMON,
  })
  @IsEnum(SeatType, { message: SESSION_MESSAGES.SESSION_SEAT_INVALID })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Tipo de assento') })
  type: SeatType;
}
