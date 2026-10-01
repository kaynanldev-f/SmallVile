import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from '../schema/products.schema';
import { ProductCategory } from '../enums/category.enum';
import { PRODUCT_MESSAGES } from '../messages/products.message';
import { HttpException, HttpStatus } from '@nestjs/common';
import mongoose from 'mongoose';

describe('ProductsService (Unitário)', () => {
  let service: ProductsService;

  const mockProductModel = {
    find: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockProductInstance = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(Product.name),
          useValue: jest.fn().mockImplementation(() => mockProductInstance),
        },
      ],
    }).compile();

    Object.assign(module.get(getModelToken(Product.name)), mockProductModel);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllGrouped', () => {
    it('deve agrupar corretamente os produtos disponíveis por suas categorias', async () => {
      const mockProducts = [
        {
          name: 'Coca-Cola',
          category: ProductCategory.BEBIDAS,
          isAvailable: true,
        },
        {
          name: 'Pipoca Grande',
          category: ProductCategory.COMIDAS,
          isAvailable: true,
        },
        {
          name: 'Combo Duplo',
          category: ProductCategory.COMBOS,
          isAvailable: true,
        },
      ];
      mockProductModel.exec.mockResolvedValue(mockProducts);

      const result = await service.findAllGrouped();

      expect(result[ProductCategory.BEBIDAS]).toHaveLength(1);
      expect(result[ProductCategory.COMIDAS]).toHaveLength(1);
      expect(result[ProductCategory.COMBOS]).toHaveLength(1);
      expect(result[ProductCategory.BEBIDAS][0].name).toBe('Coca-Cola');
    });
  });

  describe('findOne', () => {
    it('deve lançar erro se o ID for inválido', async () => {
      await expect(service.findOne('id-invalido')).rejects.toThrow(
        new HttpException(
          { message: PRODUCT_MESSAGES.PRODUCT_ID_INVALID },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('deve lançar 404 se o produto não for encontrado', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      mockProductModel.exec.mockResolvedValue(null);

      await expect(service.findOne(validId)).rejects.toThrow(
        new HttpException(
          { message: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
