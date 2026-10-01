import { PartialType } from '@nestjs/swagger';
import { CreateProductWithImageDto } from './create-product-with-image.dto';

export class UpdateProductWithImageDto extends PartialType(
  CreateProductWithImageDto,
) {}
