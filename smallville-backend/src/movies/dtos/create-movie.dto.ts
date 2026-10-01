import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Classification } from '../enums/classification.enum';
import { MovieLanguage } from '../enums/movie-language.enum';
import { MovieGenres } from '../enums/movie-genres.enum';
import { Transform, Type } from 'class-transformer';
import {
  capitalizeSentence,
  capitalizeTitle,
  FREE_TEXT_ACCEPTED_DESCRIPTION,
  FREE_TEXT_PATTERN,
  HAS_ALPHANUMERIC_PATTERN,
  normalizeFreeText,
} from 'src/common/utils/text-validation';
import { MOVIE_MESSAGES } from '../messages/movies.message';
import { ActorDto } from './actor.dto';

export class CreateMovieDto {
  @ApiProperty({ example: 'Missão: Impossível — Efeito Fallout' })
  @IsString({ message: MOVIE_MESSAGES.FIELD_IS_STRING('Título do filme') })
  @IsNotEmpty({ message: MOVIE_MESSAGES.FIELD_REQUIRED('Título do filme') })
  @Matches(HAS_ALPHANUMERIC_PATTERN, {
    message: MOVIE_MESSAGES.FIELD_NEEDS_ALPHANUMERIC('Título do filme'),
  })
  @Matches(FREE_TEXT_PATTERN, {
    message: MOVIE_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Título do filme',
      FREE_TEXT_ACCEPTED_DESCRIPTION,
    ),
  })
  // Title Case como no nome do cinema e da cidade, mas sem rebaixar o que já
  // veio com maiúscula: "Spider-Man: No Way Home" continua intacto e
  // "missao impossivel" vira "Missao Impossivel".
  @Transform(({ value }: { value: unknown }) => capitalizeTitle(value))
  @Length(2, 50, {
    message: MOVIE_MESSAGES.FIELD_LENGTH_BETWEEN('Título do filme', 2, 50),
  })
  title: string;

  @ApiProperty({ required: false, example: 'https://image.com/banner.jpg' })
  @IsUrl({}, { message: 'O banner do filme deve ser uma URL válida.' })
  @Length(10, 200, {
    message: MOVIE_MESSAGES.FIELD_LENGTH_BETWEEN('Banner do filme', 10, 200),
  })
  @IsOptional()
  banner?: string;

  @ApiProperty({ example: 'Um filme sobre viagem no espaço...' })
  @IsString({ message: MOVIE_MESSAGES.FIELD_IS_STRING('Sinopse do filme') })
  @IsNotEmpty({ message: MOVIE_MESSAGES.FIELD_REQUIRED('Sinopse do filme') })
  @Matches(FREE_TEXT_PATTERN, {
    message: MOVIE_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Sinopse do filme',
      FREE_TEXT_ACCEPTED_DESCRIPTION,
    ),
  })
  // Texto corrido, não título: sobe só a primeira letra de cada frase. Title
  // Case aqui devolveria "Esta É Uma História Sobre...".
  @Transform(({ value }: { value: unknown }) => capitalizeSentence(value))
  @Length(10, 200, {
    message: MOVIE_MESSAGES.FIELD_LENGTH_BETWEEN('Sinopse do filme', 10, 200),
  })
  synopsis: string;

  @ApiProperty({
    type: [String],
    isArray: true,
    enum: MovieGenres,
    example: [MovieGenres.SCIENCE_FICTION],
  })
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim());
    }
    return value;
  })
  @IsArray({
    message: 'Os gêneros devem ser enviados em formato de lista (array).',
  })
  @IsEnum(MovieGenres, {
    each: true,
    message: 'Um ou mais gêneros informados são inválidos.',
  })
  genres: MovieGenres[];

  @ApiProperty({ example: Classification.ANOS_12 })
  @IsEnum(Classification, { message: 'Classificação indicativa inválida.' })
  @IsNotEmpty({
    message: MOVIE_MESSAGES.FIELD_REQUIRED('Classificação indicativa'),
  })
  classification: Classification;

  @ApiProperty({ example: 148 })
  @Transform(({ value }: { value: unknown }): unknown =>
    value ? Number(value) : value,
  )
  @IsNumber({}, { message: MOVIE_MESSAGES.FIELD_IS_NUMBER('Duração') })
  @Min(1, { message: 'A duração do filme deve ser de pelo menos 1 minuto.' })
  @Max(300, {
    message: 'A duração do filme deve ser de no máximo 300 minutos.',
  })
  @IsNotEmpty({ message: MOVIE_MESSAGES.FIELD_REQUIRED('Duração') })
  duration: number;

  @ApiProperty({ example: 'Christopher Nolan' })
  @IsString({ message: MOVIE_MESSAGES.FIELD_IS_STRING('Autor/Diretor') })
  @IsNotEmpty({ message: MOVIE_MESSAGES.FIELD_REQUIRED('Autor/Diretor') })
  // Nome de diretor também tem pontuação: "J.J. Abrams", "Brian O'Halloran".
  @Matches(HAS_ALPHANUMERIC_PATTERN, {
    message: MOVIE_MESSAGES.FIELD_NEEDS_ALPHANUMERIC('Autor/Diretor'),
  })
  @Matches(FREE_TEXT_PATTERN, {
    message: MOVIE_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Autor/Diretor',
      FREE_TEXT_ACCEPTED_DESCRIPTION,
    ),
  })
  @Transform(({ value }: { value: unknown }) => normalizeFreeText(value))
  @Length(2, 50, {
    message: MOVIE_MESSAGES.FIELD_LENGTH_BETWEEN('Autor/Diretor', 2, 50),
  })
  author: string;

  @ApiProperty({
    type: () => [ActorDto],
    description:
      'Elenco do filme. Enviar como JSON string se estiver usando multipart/form-data. Exemplo: [{"name": "Matthew"}]',
  })
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value.trim());
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray({
    message: 'O elenco deve ser enviado em formato de lista (array).',
  })
  @Type(() => ActorDto)
  @IsNotEmpty({ message: 'O elenco do filme é obrigatório.' })
  cast: ActorDto[];

  @ApiProperty({ required: false, example: 'https://youtube.com/trailer' })
  @IsOptional()
  @IsUrl({}, { message: 'O trailer do filme deve ser uma URL válida.' })
  @Length(10, 200, {
    message: MOVIE_MESSAGES.FIELD_LENGTH_BETWEEN('Trailer', 10, 200),
  })
  trailer?: string;

  @ApiProperty({
    example: '01/01/2026',
    description: 'Data de lançamento no formato DD/MM/AAAA',
  })
  @IsString({ message: 'A data de lançamento deve ser uma string.' })
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'A data de lançamento deve estar no formato DD/MM/AAAA.',
  })
  @IsNotEmpty({ message: MOVIE_MESSAGES.FIELD_REQUIRED('Data de lançamento') })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : (value as string),
  )
  releaseDate: string;

  @ApiProperty({
    type: [String],
    isArray: true,
    enum: MovieLanguage,
    example: [MovieLanguage.DUBBED],
  })
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim());
    }
    return value;
  })
  @IsArray({
    message: 'Os idiomas devem ser enviados em formato de lista (array).',
  })
  @IsEnum(MovieLanguage, {
    each: true,
    message:
      'Um ou mais idiomas informados são inválidos. Use Legendado ou Dublado.',
  })
  languages: MovieLanguage[];
}
