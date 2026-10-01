import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsMongoId,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class OrderProductDto {
  @ApiProperty({ example: '667f123abc456def78901234' })
  @IsMongoId({ message: 'ID do produto inválido.' })
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateOrderProductsDto {
  @ApiProperty({ type: [OrderProductDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];
}
