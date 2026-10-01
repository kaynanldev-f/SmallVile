import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateMovieDto } from './create-movie.dto';

export class CreateMovieWithAssetsDto extends OmitType(CreateMovieDto, [
  'banner',
  'cast',
] as const) {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo de imagem do banner do filme (JPEG/PNG/WEBP)',
  })
  banner: Express.Multer.File;

  @ApiProperty({
    example: [{ name: 'Matthew McConaughey' }, { name: 'Anne Hathaway' }],
    type: 'string',
    description:
      'JSON em formato String contendo a lista com os dados do elenco.',
  })
  cast: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Arquivos contendo as fotos dos atores, respeitando RIGOROSAMENTE a mesma sequência declarada na string do cast.',
  })
  actorsPhotos: Express.Multer.File[];
}
