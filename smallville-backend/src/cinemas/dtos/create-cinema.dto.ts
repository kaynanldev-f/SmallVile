import { IsEnum, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

import { capitalizeName } from 'src/common/utils/name-validation';
import { CinemaStatus } from '../enums/cinema-status.enum';
import { CINEMA_MESSAGES } from '../messages/cinema.messages';
import { BrazilState } from 'src/common/enums/brazil-states.enum';

export class CreateCinemaDto {
  @ApiProperty({ example: 'Cinemark Shopping Iguatemi' })
  @IsString({ message: CINEMA_MESSAGES.FIELD_IS_STRING('Nome do cinema') })
  @IsNotEmpty({ message: CINEMA_MESSAGES.FIELD_REQUIRED('Nome do cinema') })
  @Transform(({ value }: { value: string }) =>
    value ? capitalizeName(value.trim()) : value,
  )
  @Length(2, 50, {
    message: CINEMA_MESSAGES.FIELD_LENGTH_BETWEEN('Nome do cinema', 2, 50),
  })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/.]+$/, {
    message: CINEMA_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Nome do cinema',
      'letras, números, espaços, hífen (-), barra (/) e ponto (.)',
    ),
  })
  name: string;

  @ApiProperty({ example: 'Av. Brigadeiro Faria Lima, 2232' })
  @IsString({ message: CINEMA_MESSAGES.FIELD_IS_STRING('Endereço') })
  @IsNotEmpty({ message: CINEMA_MESSAGES.FIELD_REQUIRED('Endereço') })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/,.]+$/, {
    message: CINEMA_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Cidade',
      'letras, números, espaços, hífen (-), barra (/), ponto (.) e vírgula (,)',
    ),
  })
  @Transform(({ value }: { value: string }) =>
    value ? capitalizeName(value.trim()) : value,
  )
  @Length(2, 50, {
    message: CINEMA_MESSAGES.FIELD_LENGTH_BETWEEN('Endereço', 2, 50),
  })
  address: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString({ message: CINEMA_MESSAGES.FIELD_IS_STRING('Cidade') })
  @IsNotEmpty({ message: CINEMA_MESSAGES.FIELD_REQUIRED('Cidade') })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/.]+$/, {
    message: CINEMA_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Nome do cinema',
      'letras, números, espaços, hífen (-), barra (/) e ponto (.)',
    ),
  })
  @Transform(({ value }: { value: string }) =>
    value ? capitalizeName(value.trim()) : value,
  )
  @Length(2, 50, {
    message: CINEMA_MESSAGES.FIELD_LENGTH_BETWEEN('Cidade', 2, 50),
  })
  city: string;

  @ApiProperty({ example: BrazilState.SP })
  @IsNotEmpty({ message: CINEMA_MESSAGES.FIELD_REQUIRED('Estado') })
  @Transform(({ value }: { value: string }) =>
    value ? value.trim().toUpperCase() : value,
  )
  @IsEnum(BrazilState, {
    message: CINEMA_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Estado',
      'a sigla do estado (ex: SP)',
    ),
  })
  state: BrazilState;

  @ApiProperty({
    example: CinemaStatus.ATIVO,
    enum: CinemaStatus,
  })
  @IsEnum(CinemaStatus, { message: 'Status do cinema inválido.' })
  status: CinemaStatus;
}
