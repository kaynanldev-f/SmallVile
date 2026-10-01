import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Length,
  Matches,
  IsUrl,
} from 'class-validator';
import { ProductCategory } from '../enums/category.enum';
import { capitalizeName } from 'src/common/utils/name-validation';
import { PRODUCT_MESSAGES } from '../messages/products.message';
import { ProductSize } from '../enums/product-size.enum';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nome descritivo do produto ou combo',
    example: 'Pipoca Salgada',
  })
  @IsString({ message: PRODUCT_MESSAGES.FIELD_IS_STRING('Nome do produto') })
  @IsNotEmpty({ message: PRODUCT_MESSAGES.FIELD_REQUIRED('Nome do produto') })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/,.]+$/, {
    message: PRODUCT_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Nome do produto',
      'letras, números, espaços, hífen (-), barra (/), ponto (.) e vírgula (,)',
    ),
  })
  @Length(2, 100, {
    message: PRODUCT_MESSAGES.FIELD_LENGTH_BETWEEN('Nome do produto', 2, 100),
  })
  @Transform(({ value }: { value: string }) => capitalizeName(value?.trim()))
  name: string;

  @ApiProperty({
    description: 'Categoria do produto de acordo com o catálogo',
    enum: ProductCategory,
    example: ProductCategory.COMIDAS,
  })
  @IsEnum(ProductCategory, {
    message: PRODUCT_MESSAGES.FIELD_IS_ENUM(
      'Categoria',
      'BEBIDAS, COMIDAS ou COMBOS',
    ),
  })
  category: ProductCategory;

  @ApiProperty({
    description:
      'Tamanho, volumetria ou itens inclusos (obrigatório para comidas/bebidas, descritivo para combos)',
    example: ProductSize.MEDIUM,
    required: false,
  })
  @IsEnum(ProductSize, {
    message: PRODUCT_MESSAGES.FIELD_IS_ENUM(
      'Tamanho',
      'Pequeno, Médio ou Grande',
    ),
  })
  @IsOptional()
  size?: ProductSize;

  @ApiProperty({
    description: 'Limite máximo permitido para este item em um único pedido',
    example: 6,
    default: 6,
  })
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: PRODUCT_MESSAGES.FIELD_IS_NUMBER('Limite máximo') })
  @Min(1, { message: PRODUCT_MESSAGES.FIELD_MIN('Limite máximo', 1) })
  maxLimit: number;

  @ApiProperty({
    description:
      'Quantidade física disponível no estoque para o controle do painel administrativo',
    example: 150,
  })
  @Transform(({ value }) => Number(value))
  @IsNumber(
    {},
    { message: PRODUCT_MESSAGES.FIELD_IS_NUMBER('Quantidade em estoque') },
  )
  @Min(0, { message: PRODUCT_MESSAGES.FIELD_MIN('Quantidade em estoque', 0) })
  quantity: number;

  @ApiProperty({
    description: 'Preço de venda do produto armazenado em centavos...',
    example: 1500,
  })
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: PRODUCT_MESSAGES.FIELD_IS_NUMBER('Preço') })
  @Min(0, { message: PRODUCT_MESSAGES.FIELD_MIN('Preço', 0) })
  price: number;

  @ApiProperty({
    description:
      'Define se o produto está ativo e visível para seleção na listagem de disponíveis',
    example: true,
    required: true,
    default: true,
  })
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1';
  })
  @IsBoolean({ message: PRODUCT_MESSAGES.FIELD_IS_BOOLEAN('Disponibilidade') })
  isAvailable: boolean;

  @ApiProperty({
    required: false,
    example: 'https://image.com/product.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'A imagem do produto deve ser uma URL válida.' })
  @Length(10, 200, {
    message: PRODUCT_MESSAGES.FIELD_LENGTH_BETWEEN(
      'Imagem do produto',
      10,
      200,
    ),
  })
  imageUrl?: string;
}
