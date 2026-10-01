import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../service/products.service';
import { JwtService } from '@nestjs/jwt';
import { PRODUCT_MESSAGES } from '../messages/products.message';
import { ProductCategory } from '../enums/category.enum';
import { ProductController } from './products.controller';
import { StorageService } from 'src/storage/storage.service';

describe('ProductController (Unitário)', () => {
  let controller: ProductController;
  let service: ProductsService;

  const mockProductsService = {
    findAll: jest.fn(),
    findAllAvailable: jest.fn(),
    findAllGrouped: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtService = { verifyAsync: jest.fn() };

  // Criamos o mock para o StorageService
  const mockStorageService = {
    uploadFile: jest
      .fn()
      .mockResolvedValue({ url: 'https://fakeimage.com/product.jpg' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: StorageService, useValue: mockStorageService }, // Injetado aqui
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllAvailable', () => {
    it('deve chamar findAllGrouped se query params grouped for igual a true', async () => {
      const mockGrouped = {
        [ProductCategory.BEBIDAS]: [],
        [ProductCategory.COMIDAS]: [],
        [ProductCategory.COMBOS]: [],
      };
      mockProductsService.findAllGrouped.mockResolvedValue(mockGrouped);

      const result = await controller.getAllAvailable('true');

      expect(jest.spyOn(service, 'findAllGrouped')).toHaveBeenCalled();
      expect(result).toEqual({
        message: PRODUCT_MESSAGES.PRODUCTS_FOUND,
        data: mockGrouped,
      });
    });

    it('deve chamar lista simples se grouped não for enviado', async () => {
      const mockList = [{ name: 'Nachos' }];
      mockProductsService.findAllAvailable.mockResolvedValue(mockList);

      const result = await controller.getAllAvailable();

      expect(jest.spyOn(service, 'findAllAvailable')).toHaveBeenCalled();
      expect(result).toEqual({
        message: PRODUCT_MESSAGES.PRODUCTS_FOUND,
        data: mockList,
      });
    });
  });
});
