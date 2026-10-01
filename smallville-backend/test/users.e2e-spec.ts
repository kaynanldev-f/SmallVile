import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

import { UsersModule } from '../src/users/users.module';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserService } from '../src/users/service/users.service';
import { UserRole } from '../src/users/enums/user-roles.enum';
import { User } from '../src/users/schemas/users.schema';

interface RequestWithUser {
  user?: {
    sub: string;
    role: UserRole;
  };
}

interface UsersApiResponse {
  message: string;
  data: unknown[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

describe('Users Module (E2E)', () => {
  let app: INestApplication;
  let baseUrl: string;

  const users = [
    {
      _id: '64a2b3c4e5f67a8b9c0d1e2f',
      name: 'Usuário Teste',
      email: 'teste@teste.com',
    },
  ];

  const mockAuthGuard = {
    canActivate: jest.fn().mockImplementation((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest<RequestWithUser>();

      request.user = {
        sub: '64a2b3c4e5f67a8b9c0d1e2f',
        role: UserRole.ADMIN,
      };

      return true;
    }),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockUserService = {
    findAllUsers: jest.fn().mockResolvedValue({
      users,
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    }),
  };

  // model do Mongoose nunca é usado de verdade,
  // mas o UsersModule precisa que o token exista no contexto
  const mockUserModel = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(getModelToken(User.name))
      .useValue(mockUserModel)
      .overrideProvider(UserService)
      .useValue(mockUserService)
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    await app.init();
    await app.listen(0);

    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserService.findAllUsers.mockResolvedValue({
      users,
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
  });

  describe('GET /users', () => {
    it('Deve listar usuários com sucesso', async () => {
      const response = await fetch(`${baseUrl}/users`);

      const body = (await response.json()) as UsersApiResponse;

      expect(response.status).toBe(HttpStatus.OK);

      expect(body.data).toHaveLength(1);

      expect(body.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      expect(mockUserService.findAllUsers).toHaveBeenCalled();
    });
  });
});
