import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { TicketsModule } from '../src/tickets/tickets.module';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '../src/users/enums/user-roles.enum';
import { TICKETS_MESSAGES } from '../src/tickets/messages/tickets.message';

interface CustomRequest {
  user?: { sub: string; role: UserRole };
}

// A listagem monta o filtro com `new mongoose.Types.ObjectId(userId)`, então
// os ids do usuário logado precisam ser ObjectIds válidos.
const USER_ID = '507f1f77bcf86cd799439011';
const ADMIN_ID = '507f1f77bcf86cd799439012';

describe('Tickets Module (E2E)', () => {
  let app: INestApplication;
  let mockCurrentUser: { sub: string; role: UserRole };

  const mockCountExec = jest.fn().mockResolvedValue(0);

  const mockTicketModel = {
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    // A contagem tem cadeia própria: `findAllForRequester` dispara os dois
    // `exec()` em paralelo e cada um devolve um resultado diferente.
    countDocuments: jest.fn(() => ({ exec: mockCountExec })),
    exec: jest.fn(),
  };

  const mockSessionModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockMovieModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockOrderModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    mockCurrentUser = { sub: USER_ID, role: UserRole.USER };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      // O ConfigModule é global na aplicação; o TicketCodeService depende
      // dele para assinar o QR Code.
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ TOKEN_SECRET: 'secret-de-teste-smallville' })],
        }),
        TicketsModule,
      ],
    })
      .overrideProvider(getModelToken('Ticket'))
      .useValue(mockTicketModel)

      .overrideProvider(getModelToken('Session'))
      .useValue(mockSessionModel)

      .overrideProvider(getModelToken('User'))
      .useValue(mockUserModel)

      .overrideProvider(getModelToken('Movie'))
      .useValue(mockMovieModel)

      // O TicketsModule registra o schema de Order para que o populate de
      // `orderId` funcione; sem o override o Nest tentaria abrir conexão.
      .overrideProvider(getModelToken('Order'))
      .useValue(mockOrderModel)

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /tickets', () => {
    it('Deve restringir a listagem aos próprios ingressos quando for um USER', async () => {
      mockCurrentUser = {
        sub: USER_ID,
        role: UserRole.USER,
      };

      mockTicketModel.exec.mockResolvedValue([{ _id: 'ticket-1' }]);
      mockCountExec.mockResolvedValue(1);

      const response = await request(app.getHttpServer() as string)
        .get('/tickets')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        TICKETS_MESSAGES.TICKETS_FOUND,
      );

      // A regra de visibilidade é aplicada no servidor: o filtro sai preso ao
      // id do requisitante, mesmo sem nenhum parâmetro na query.
      const [filter] = mockTicketModel.find.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(filter.userId).toEqual(new Types.ObjectId(USER_ID));
    });

    it('Deve listar todos se for um ADMIN', async () => {
      mockCurrentUser = {
        sub: ADMIN_ID,
        role: UserRole.ADMIN,
      };

      mockTicketModel.exec.mockResolvedValue([
        {
          _id: 'ticket-1',
        },
      ]);
      mockCountExec.mockResolvedValue(1);

      const response = await request(app.getHttpServer() as string)
        .get('/tickets')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        TICKETS_MESSAGES.TICKETS_FOUND,
      );
      expect(response.body).toMatchObject({ total: 1, page: 1, limit: 10 });

      // Sem filtro por usuário: o administrador enxerga o sistema inteiro.
      const [filter] = mockTicketModel.find.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(filter).not.toHaveProperty('userId');
    });
  });
});
