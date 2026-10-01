import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomType } from '../enums/room-type.enum';
import { SeatDto } from './seats.dto';
import { Transform, Type } from 'class-transformer';
import { SESSION_MESSAGES } from '../messages/sessions.messages';
import {
  capitalizeTitle,
  FREE_TEXT_ACCEPTED_DESCRIPTION,
  FREE_TEXT_PATTERN,
  HAS_ALPHANUMERIC_PATTERN,
  normalizeFreeText,
} from 'src/common/utils/text-validation';
import { MovieLanguage } from 'src/movies/enums/movie-language.enum';

export class CreateSessionDto {
  @ApiProperty({
    description: 'ID do cinema onde a sessão vai ocorrer',
    example: '64a2b3c4e5f67a8b9c0d1e2f',
    type: String,
  })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Cinema') })
  cinemaId: string;

  @ApiProperty({
    description: 'Título do filme em exibição',
    example: 'Interestelar',
    type: String,
  })
  @IsString({ message: SESSION_MESSAGES.FIELD_IS_STRING('Título do filme') })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Título do filme') })
  // Mesma régua do cadastro de filme: a sessão guarda o título já
  // denormalizado, então recusar ":" ou "&" aqui impediria criar sessão de
  // um filme que o catálogo aceita.
  @Matches(HAS_ALPHANUMERIC_PATTERN, {
    message: SESSION_MESSAGES.FIELD_NEEDS_ALPHANUMERIC('Título do filme'),
  })
  @Matches(FREE_TEXT_PATTERN, {
    message: SESSION_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Título do filme',
      FREE_TEXT_ACCEPTED_DESCRIPTION,
    ),
  })
  @Transform(({ value }: { value: unknown }) => normalizeFreeText(value))
  @Length(2, 50, {
    message: SESSION_MESSAGES.FIELD_LENGTH_BETWEEN('Título do filme', 2, 50),
  })
  movieTitle: string;

  @ApiProperty({
    description: 'Nome ou identificação da sala de cinema',
    example: 'Sala CineVille 01',
    type: String,
  })
  @IsString({ message: SESSION_MESSAGES.FIELD_IS_STRING('Nome da sala') })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Nome da sala') })
  @Matches(HAS_ALPHANUMERIC_PATTERN, {
    message: SESSION_MESSAGES.FIELD_NEEDS_ALPHANUMERIC('Nome da sala'),
  })
  @Matches(FREE_TEXT_PATTERN, {
    message: SESSION_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Nome da sala',
      FREE_TEXT_ACCEPTED_DESCRIPTION,
    ),
  })
  // Mesmo Title Case do título do filme e do nome do cinema: "sala premium"
  // é gravado como "Sala Premium", e "Sala IMAX" não perde a sigla.
  @Transform(({ value }: { value: unknown }) => capitalizeTitle(value))
  @Length(2, 50, {
    message: SESSION_MESSAGES.FIELD_LENGTH_BETWEEN('Nome da sala', 2, 50),
  })
  roomName: string;

  @ApiProperty({
    description: 'Tipo de tecnologia da sala',
    enum: RoomType,
    example: RoomType.THREE_D,
  })
  @IsEnum(RoomType, { message: 'Tipo de sala inválido. Use COMUM ou 3D.' })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Tipo de sala') })
  roomType: RoomType;

  @ApiProperty({
    description: 'Idioma desta sessão específica',
    enum: MovieLanguage,
    example: MovieLanguage.DUBBED,
  })
  @IsEnum(MovieLanguage, { message: 'Idioma da sessão inválido.' })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Idioma') })
  language: MovieLanguage;

  @ApiProperty({
    description:
      'Data e horário de início da sessão no formato DD/MM/AAAA HH:MM',
    example: '15/11/2026 20:30',
    type: String,
  })
  @IsString({ message: 'A data e hora devem ser uma string.' })
  @Matches(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/, {
    message: 'A data e hora da sessão devem estar no formato DD/MM/AAAA HH:MM.',
  })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Data e hora') })
  dateTime: string;

  @ApiProperty({
    description: 'Preço base do ingresso para a sessão',
    example: 3500,
    type: Number,
    minimum: 0,
  })
  @IsNumber({}, { message: SESSION_MESSAGES.FIELD_IS_NUMBER('Preço') })
  @Min(0, { message: 'O preço não pode ser menor que zero.' })
  @IsNotEmpty({ message: SESSION_MESSAGES.FIELD_REQUIRED('Preço') })
  price: number;

  @IsOptional()
  @IsArray({
    message: 'Os assentos devem ser enviados em formato de lista (array).',
  })
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats?: SeatDto[];
}
