import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';
import { MOVIE_MESSAGES } from '../messages/movies.message';

export class ActorDto {
  @ApiProperty({ example: 'Matthew McConaughey' })
  @IsString({ message: MOVIE_MESSAGES.FIELD_IS_STRING('Nome do Ator') })
  @IsNotEmpty({ message: 'O nome do ator é obrigatório.' })
  name: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string; // Preenchido pelo backend após o upload
}

export class CreateActorWithPhotoDto extends ActorDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Foto do ator',
  })
  photo: Express.Multer.File;
}
