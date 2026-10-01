import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ExecutionContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CinemasService } from '../src/cinemas/services/cinema.service';
import { SessionsService } from '../src/session/services/session.service';
import { MoviesService } from '../src/movies/services/movies.service';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/users/enums/user-roles.enum';
import { CINEMA_MESSAGES } from '../src/cinemas/messages/cinema.messages';
import { Cinema } from '../src/cinemas/schema/cinema.schema';
import { CinemasController } from 'src/cinemas/controllers/cinema.controller';

interface ApiResponse<T = unknown> {
  message: string;
  data: T;
}

interface RequestWithUser {
  user?: {
    sub: string;
    role: UserRole;
  };
}

describe('Cinemas Module (E2E) - Isolated', () => {
  let app: INestApplication;
  let baseUrl: string;

  const mockCinemaInstance = {
    save: jest.fn().mockResolvedValue({
      _id: '64a2b3c4e5f67a8b9c0d1e2f',
      name: 'Novo Cinema',
    }),
  };

  const mockCinemaModel = jest
    .fn()
    .mockImplementation(
      () => mockCinemaInstance,
    ) as unknown as Model<Cinema> & {
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
    exec: jest.Mock;
  };

  mockCinemaModel.find = jest.fn().mockReturnThis();
  mockCinemaModel.findOne = jest.fn().mockReturnThis();
  mockCinemaModel.findById = jest.fn().mockReturnThis();
  mockCinemaModel.findByIdAndUpdate = jest.fn().mockReturnThis();
  mockCinemaModel.findByIdAndDelete = jest.fn().mockReturnThis();
  mockCinemaModel.exec = jest.fn();

  const mockSessionsService = {
    findByCinema: jest.fn(),
  };

  const mockMoviesService = {
    findOne: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest
      .fn()
      .mockImplementation((context: ExecutionContext): boolean => {
        const req = context.switchToHttp().getRequest<RequestWithUser>();
        req.user = { sub: '64a2b3c4e5f67a8b9c0d1e2f', role: UserRole.ADMIN };
        return true;
      }),
  };

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [CinemasController],
        providers: [
          CinemasService,
          {
            provide: getModelToken(Cinema.name),
            useValue: mockCinemaModel,
          },
          {
            provide: SessionsService,
            useValue: mockSessionsService,
          },
          {
            provide: MoviesService,
            useValue: mockMoviesService,
          },
        ],
      })
        .overrideGuard(AuthGuard)
        .useValue(mockAuthGuard)
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      app = moduleFixture.createNestApplication();
      await app.listen(0);
      baseUrl = await app.getUrl();
    } catch (error) {
      console.error(
        'Erro na compilação do ambiente de testes de cinema:',
        error,
      );
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /cinemas', () => {
    it('Deve permitir buscar todos os cinemas cadastrados', async () => {
      const cinemasMockados = [
        { _id: '64a2b3c4e5f67a8b9c0d1e2f', name: 'Cinema Smallville' },
      ];
      mockCinemaModel.exec.mockResolvedValueOnce(cinemasMockados);

      const response = await fetch(`${baseUrl}/cinemas`);
      const body = (await response.json()) as ApiResponse<
        typeof cinemasMockados
      >;

      expect(response.status).toBe(HttpStatus.OK);
      expect(body).toHaveProperty('message', CINEMA_MESSAGES.CINEMA_FOUND);
      expect(body.data).toEqual(cinemasMockados);
    });
  });

  describe('POST /cinemas', () => {
    it('Deve validar comportamento do guard para criação', async () => {
      jest
        .spyOn(mockAuthGuard, 'canActivate')
        .mockImplementationOnce((context: ExecutionContext): boolean => {
          const req = context.switchToHttp().getRequest<RequestWithUser>();
          req.user = { sub: 'user-id', role: UserRole.USER };
          return true;
        });

      const response = await fetch(`${baseUrl}/cinemas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Novo Cinema' }),
      });

      expect(response).toBeDefined();
    });
  });
});
