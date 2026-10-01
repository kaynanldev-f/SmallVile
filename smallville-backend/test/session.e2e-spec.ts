import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, Module } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/users/enums/user-roles.enum';
import { SessionsModule } from '../src/session/session.module';
import { SESSION_MESSAGES } from '../src/session/messages/sessions.messages';
import { MoviesService } from '../src/movies/services/movies.service';
import { CinemasService } from '../src/cinemas/services/cinema.service';
import { MoviesModule } from '../src/movies/movies.module';
import { CinemasModule } from '../src/cinemas/cinema.module'; // ajuste o caminho se necessário do seu arquivo de módulo
import { TicketPricingService } from '../src/sales-control/services/ticket-pricing.service';

interface CustomRequest {
  user?: { sub: string; role: UserRole };
}

const mockSessionModel = {
  find: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockCinemaModel = {}; // Evita o erro do Mongoose procurando DatabaseConnection

// O SessionsModule registra o model de pedido (leitura, para avisar quem
// comprou) e importa Notifications/SalesControl, que registram os seus.
// Sem estes mocks o Mongoose tenta abrir a DatabaseConnection de verdade.
const mockOrderModel = {
  distinct: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};
const mockNotificationModel = {};
const mockUserModel = {};
const mockTicketPriceRuleModel = {};

const mockPricing = {
  fullPrice: 3000,
  halfPrice: 1500,
  source: 'sessao',
};

const mockAvailability = {
  enabled: true,
  onSale: true,
  startsAt: null,
  endsAt: null,
};

// A listagem devolve cada sessão junto do preço vigente e da situação da
// venda; aqui o cálculo é fixo para o teste olhar só a rota.
const mockPricingService = {
  resolveForSession: jest.fn().mockResolvedValue(mockPricing),
  describeAvailability: jest.fn().mockReturnValue(mockAvailability),
};

const mockMoviesService = {
  findByTitle: jest.fn(),
};

const mockCinemasService = {
  findOne: jest.fn(),
};

@Module({
  providers: [{ provide: MoviesService, useValue: mockMoviesService }],
  exports: [MoviesService],
})
class FakeMoviesModule {}

@Module({
  providers: [{ provide: CinemasService, useValue: mockCinemasService }],
  exports: [CinemasService],
})
class FakeCinemasModule {}

// Mockando estaticamente para evitar referências circulares de runtime
jest.mock('../src/movies/movies.module', () => ({
  MoviesModule: class {},
}));

jest.mock('../src/cinemas/cinema.module', () => ({
  CinemasModule: class {},
}));

describe('Sessions Module (E2E)', () => {
  let app: INestApplication;
  let mockCurrentUser: { sub: string; role: UserRole };

  beforeEach(async () => {
    mockCurrentUser = { sub: 'user-id', role: UserRole.USER };

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [SessionsModule],
      })
        .overrideProvider(getModelToken('Session'))
        .useValue(mockSessionModel)
        .overrideProvider(getModelToken('Cinema')) // Alimenta o token caso o módulo real vaze
        .useValue(mockCinemaModel)
        .overrideProvider(getModelToken('Order'))
        .useValue(mockOrderModel)
        .overrideProvider(getModelToken('Notification'))
        .useValue(mockNotificationModel)
        .overrideProvider(getModelToken('User'))
        .useValue(mockUserModel)
        .overrideProvider(getModelToken('TicketPriceRule'))
        .useValue(mockTicketPriceRuleModel)
        .overrideProvider(TicketPricingService)
        .useValue(mockPricingService)
        .overrideModule(MoviesModule)
        .useModule(FakeMoviesModule)
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
    } catch (error) {
      console.error('Erro na compilação do módulo de testes:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /sessions', () => {
    it('Deve permitir que usuários comuns (USER) listem as sessões (Rota pública/autenticada)', async () => {
      mockSessionModel.exec.mockResolvedValue([]);

      const response = await request(app.getHttpServer() as string)
        .get('/sessions')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        SESSION_MESSAGES.SESSIONS_FOUND,
      );
    });
  });

  describe('GET /sessions/movie/:movieTitle', () => {
    it('Deve permitir buscar as sessões de um filme pelo título', async () => {
      const sessionData = {
        movieTitle: 'SmallVille: O Filme',
        roomName: 'Sala 1',
      };
      // O serviço serializa o documento antes de anexar preço e venda.
      mockSessionModel.exec.mockResolvedValue([
        { ...sessionData, toJSON: () => sessionData },
      ]);

      const response = await request(app.getHttpServer() as string)
        .get('/sessions/movie/SmallVille:%20O%20Filme')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        SESSION_MESSAGES.SESSIONS_FOUND,
      );

      const body = response.body as { data: Record<string, unknown>[] };
      expect(body.data).toEqual([
        { ...sessionData, pricing: mockPricing, sales: mockAvailability },
      ]);
    });
  });

  describe('POST /sessions', () => {
    it('Deve negar acesso (403) para criação se o usuário logado não for ADMIN', async () => {
      mockCurrentUser = { sub: 'user-id', role: UserRole.USER };

      await request(app.getHttpServer() as string)
        .post('/sessions')
        .send({ movieTitle: 'Inception' })
        .expect(403);
    });
  });
});
