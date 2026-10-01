import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Product, ProductDocument } from '../schema/products.schema';
import { ProductCategory } from '../enums/category.enum';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { PRODUCT_MESSAGES } from '../messages/products.message';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findAllAvailable(): Promise<Product[]> {
    return this.productModel.find({ isAvailable: true }).exec();
  }

  async findAllGrouped(): Promise<Record<ProductCategory, Product[]>> {
    const products = await this.findAllAvailable();
    return {
      [ProductCategory.BEBIDAS]: products.filter(
        (p) => p.category === ProductCategory.BEBIDAS,
      ),
      [ProductCategory.COMIDAS]: products.filter(
        (p) => p.category === ProductCategory.COMIDAS,
      ),
      [ProductCategory.COMBOS]: products.filter(
        (p) => p.category === ProductCategory.COMBOS,
      ),
    };
  }

  async findOne(id: string): Promise<Product> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: PRODUCT_MESSAGES.PRODUCT_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new HttpException(
        { message: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const newProduct = new this.productModel(createProductDto);
    return newProduct.save();
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: PRODUCT_MESSAGES.PRODUCT_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();

    if (!updatedProduct) {
      throw new HttpException(
        { message: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
    return updatedProduct;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: PRODUCT_MESSAGES.PRODUCT_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new HttpException(
        { message: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
    return { message: PRODUCT_MESSAGES.PRODUCT_DELETED };
  }

  async decrementStock(
    productId: string,
    quantity: number,
    session?: mongoose.ClientSession,
  ): Promise<ProductDocument> {
    const updated = await this.productModel
      .findOneAndUpdate(
        { _id: productId, quantity: { $gte: quantity }, isAvailable: true },
        { $inc: { quantity: -quantity } },
        { new: true, session },
      )
      .exec();

    if (!updated) {
      throw new HttpException(
        { message: `Estoque insuficiente para o produto ${productId}.` },
        HttpStatus.BAD_REQUEST,
      );
    }

    return updated;
  }

  /** Devolve ao estoque a quantidade retida por um pedido cancelado. */
  async restoreStock(
    productId: string,
    quantity: number,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return;
    }

    await this.productModel
      .updateOne({ _id: productId }, { $inc: { quantity } }, { session })
      .exec();
  }
}
