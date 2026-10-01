import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, Module } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/users/enums/user-roles.enum';

// 1. MOCK COMPLETO DO PROVEDOR DO FIREBASE (Antes de importar o módulo de filmes)
jest.mock('../src/storage/firebase.provider', () => ({
  firebaseProvider: {
    provide: 'FIREBASE_APP',
    useFactory: () => ({
      storage: () => ({
        bucket: () => ({
          file: () => ({
            save: () => Promise.resolve(),
            getSignedUrl: () =>
              Promise.resolve(['https://fakeimage.com/banner.jpg']),
          }),
        }),
      }),
    }),
  },
}));

// Mock do módulo de sessões para evitar que ele interfira de forma síncrona
jest.mock('../src/session/session.module', () => {
  return {
    SessionsModule: class {},
  };
});

// Mesmo motivo: o módulo de cinemas registra um model do Mongoose que exigiria conexão real
jest.mock('../src/cinemas/cinema.module', () => {
  return {
    CinemasModule: class {},
  };
});

import { MoviesModule } from '../src/movies/movies.module';
import { MOVIE_MESSAGES } from '../src/movies/messages/movies.message';
import { SessionsService } from '../src/session/services/session.service';
import { SessionsModule } from '../src/session/session.module';
import { StorageService } from '../src/storage/storage.service';
import { CinemasService } from '../src/cinemas/services/cinema.service';
import { CinemasModule } from '../src/cinemas/cinema.module';

interface CustomRequest {
  user?: { sub: string; role: UserRole };
}

const mockMovieModel = {
  find: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockSessionsService = {
  findByMovie: jest.fn(),
};

const mockCinemasService = {
  findManyByIds: jest.fn().mockResolvedValue([]),
};

const mockStorageService = {
  uploadFile: jest
    .fn()
    .mockResolvedValue({ url: 'https://fakeimage.com/banner.jpg' }),
};

@Module({
  providers: [{ provide: SessionsService, useValue: mockSessionsService }],
  exports: [SessionsService],
})
class FakeSessionsModule {}

@Module({
  providers: [{ provide: CinemasService, useValue: mockCinemasService }],
  exports: [CinemasService],
})
class FakeCinemasModule {}

describe('Movies Module (E2E)', () => {
  let app: INestApplication;
  let mockCurrentUser: { sub: string; role: UserRole };

  beforeEach(async () => {
    mockCurrentUser = { sub: 'user-id', role: UserRole.USER };

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [MoviesModule],
      })
        .overrideProvider(getModelToken('Movie'))
        .useValue(mockMovieModel)
        .overrideProvider(StorageService)
        .useValue(mockStorageService)
        .overrideModule(SessionsModule)
        .useModule(FakeSessionsModule)
        .overrideModule(CinemasModule)
        .useModule(FakeCinemasModule)
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
    } catch (err) {
      console.error('Falha ao compilar módulo de testes E2E de filmes:', err);
      throw err;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /movies', () => {
    it('Deve listar os filmes com status 200 para usuários normais', async () => {
      mockMovieModel.exec.mockResolvedValue([]);

      const response = await request(app.getHttpServer() as string)
        .get('/movies')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        MOVIE_MESSAGES.MOVIES_FOUND,
      );
    });
  });

  describe('POST /movies', () => {
    it('Deve bloquear requisição de criação (403) caso usuário não seja um ADMIN', async () => {
      await request(app.getHttpServer() as string)
        .post('/movies')
        .send({ title: 'Avatar 3' })
        .expect(403);
    });
  });
});
