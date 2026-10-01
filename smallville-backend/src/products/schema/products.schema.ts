import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ProductCategory } from '../enums/category.enum';

export type ProductDocument = Product &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };

@Schema({
  collection: 'products',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false,
})
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true, enum: ProductCategory })
  category: ProductCategory;

  @Prop({ required: false })
  size?: string;

  @Prop({ required: true, default: 6 })
  maxLimit: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, default: true })
  isAvailable: boolean;

  @Prop({ required: true })
  imageUrl: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.virtual('priceFormatted').get(function (this: ProductDocument) {
  const valueInBRL = this.price / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInBRL);
});
