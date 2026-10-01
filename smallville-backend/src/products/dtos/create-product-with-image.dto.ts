import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class CreateProductWithImageDto extends OmitType(CreateProductDto, [
  'imageUrl',
] as const) {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo de imagem do produto (JPEG/PNG)',
  })
  image: Express.Multer.File;
}
