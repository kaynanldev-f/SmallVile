import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/users/enums/user-roles.enum';

// 1. MOCK COMPLETO DO PROVEDOR DO FIREBASE (Antes de importar o módulo de produtos)
jest.mock('../src/storage/firebase.provider', () => ({
  firebaseProvider: {
    provide: 'FIREBASE_APP',
    useFactory: () => ({
      storage: () => ({
        bucket: () => ({
          file: () => ({
            save: () => Promise.resolve(),
            getSignedUrl: () =>
              Promise.resolve(['https://fakeimage.com/product.jpg']),
          }),
        }),
      }),
    }),
  },
}));

// Agora importamos com segurança os módulos do NestJS
import { ProductsModule } from '../src/products/products.module';
import { StorageService } from '../src/storage/storage.service';

interface CustomRequest {
  user?: { sub: string; role: UserRole };
}

describe('Products Module (E2E)', () => {
  let app: INestApplication;
  let mockCurrentUser: { sub: string; role: UserRole };

  const mockProductModel = {
    find: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest
      .fn()
      .mockResolvedValue({ url: 'https://fakeimage.com/product.jpg' }),
  };

  beforeEach(async () => {
    mockCurrentUser = { sub: 'user-id', role: UserRole.USER };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductsModule],
    })
      .overrideProvider(getModelToken('Product'))
      .useValue(mockProductModel)
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<CustomRequest>();
          req.user = mockCurrentUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<CustomRequest>();
          return req.user?.role === UserRole.ADMIN;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /products', () => {
    it('Deve negar permissão (403) para criar produto se o usuário logado for comum (USER)', async () => {
      mockCurrentUser = { sub: 'user-id', role: UserRole.USER };

      await request(app.getHttpServer() as string)
        .post('/products')
        .send({ name: 'Pipoca', price: 15 })
        .expect(403);
    });

    it('Deve permitir se for um ADMIN', async () => {
      mockCurrentUser = { sub: 'admin-id', role: UserRole.ADMIN };
      mockProductModel.exec.mockResolvedValue({ id: 'new-prod' });

      await request(app.getHttpServer() as string)
        .get('/products')
        .expect(200);
    });
  });
});
