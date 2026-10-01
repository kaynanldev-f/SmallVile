import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, Global, Module } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { getModelToken } from '@nestjs/mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { USER_MESSAGES } from '../src/users/messages/users.message';
import { UserRole } from '../src/users/enums/user-roles.enum';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

const mockMailerService = { sendMail: jest.fn().mockResolvedValue(undefined) };

/**
 * Na aplicação o transporte SMTP vem do MailModule, que é global. Aqui ele é
 * substituído por um duplo em memória: o teste não deve abrir conexão SMTP
 * nem depender das variáveis MAIL_*.
 */
@Global()
@Module({
  providers: [{ provide: MailerService, useValue: mockMailerService }],
  exports: [MailerService],
})
class MockMailModule {}

// Definição da interface do corpo da resposta HTTP para evitar inferência como 'any'
interface EnrichedResponse extends request.Response {
  body: {
    message: string;
    data?: {
      token?: string;
      password?: string;
    };
  };
}

describe('Auth & Register Flow (E2E)', () => {
  let app: INestApplication;

  // Criamos o mock tipando-o estritamente como um Mock do Jest
  const mockUserModel = jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  })) as jest.Mock & {
    findOne: jest.Mock;
    create: jest.Mock;
  };

  // Declaramos explicitamente as propriedades estáticas requisitadas pelo Service
  mockUserModel.findOne = jest.fn();
  mockUserModel.create = jest.fn();

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET: 'secret-de-teste-smallville' })],
        }),
        JwtModule.register({
          global: true,
          secret: 'secret-de-teste-smallville',
          signOptions: { expiresIn: '1h' },
        }),
        MockMailModule,
        AuthModule,
      ],
    })
      .overrideProvider(getModelToken('User'))
      .useValue(mockUserModel)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // ROTA: POST /register
  // ==========================================
  describe('POST /register', () => {
    const validRegisterDto = {
      name: 'Yan',
      surname: 'Developer',
      email: 'yan@smallville.com',
      password: 'Senha123@',
      confirmPassword: 'Senha123@',
      cpf: '529.982.247-25',
      birthDate: '01/01/1990',
      phone: '21999999999',
    };

    it('Deve registrar um novo usuário com sucesso (Status 201)', async () => {
      const mockSavedUser = {
        ...validRegisterDto,
        _id: 'mocked-mongo-id',
        role: UserRole.USER,
        toObject: jest.fn().mockReturnValue({
          _id: 'mocked-mongo-id',
          name: 'Yan',
          email: 'yan@smallville.com',
          role: UserRole.USER,
        }),
      };

      // Corrente mockada simulando o encadeamento do Mongoose de forma estrita
      const mongooseChainMock = {
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
        then: jest
          .fn()
          .mockImplementation((callback: (val: null) => Promise<null>) =>
            Promise.resolve(callback(null)),
          ),
      };
      mockUserModel.findOne.mockReturnValue(mongooseChainMock);

      mockUserModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedUser),
      }));

      const response = (await request(app.getHttpServer() as string)
        .post('/register')
        .send(validRegisterDto)
        .expect(HttpStatus.CREATED)) as EnrichedResponse;

      expect(response.body).toHaveProperty(
        'message',
        USER_MESSAGES.REGISTRATION_SUCCESS,
      );
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('Deve retornar 400 se as senhas enviadas forem diferentes', async () => {
      const badPasswordDto = {
        ...validRegisterDto,
        confirmPassword: 'outra_senha',
      };

      const response = (await request(app.getHttpServer() as string)
        .post('/register')
        .send(badPasswordDto)
        .expect(HttpStatus.BAD_REQUEST)) as EnrichedResponse;

      expect(response.body.message).toBe(
        USER_MESSAGES.CONFIRM_PASSWORD_MUST_MATCH,
      );
    });
  });

  // ==========================================
  // ROTA: POST /auth/login
  // ==========================================
  describe('POST /auth/login', () => {
    it('Deve autenticar com sucesso e retornar o token JWT (Status 200)', async () => {
      const hashedPassword = await bcrypt.hash('senha_correta', 10);
      const mockDbUser = {
        _id: 'user-id-abc',
        name: 'Yan',
        surname: 'Developer',
        email: 'yan@smallville.com',
        password: hashedPassword,
        role: UserRole.USER,
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockDbUser),
      });

      const response = (await request(app.getHttpServer() as string)
        .post('/auth/login')
        .send({ email: 'yan@smallville.com', password: 'senha_correta' })
        .expect(HttpStatus.OK)) as EnrichedResponse;

      expect(response.body).toHaveProperty(
        'message',
        USER_MESSAGES.LOGIN_SUCCESS,
      );
      expect(response.body.data).toHaveProperty('token');
      expect(typeof response.body.data?.token).toBe('string');
    });

    it('Deve retornar 401 se a senha estiver incorreta', async () => {
      const hashedPassword = await bcrypt.hash('senha_correta', 10);
      const mockDbUser = {
        email: 'yan@smallville.com',
        password: hashedPassword,
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockDbUser),
      });

      const response = (await request(app.getHttpServer() as string)
        .post('/auth/login')
        .send({ email: 'yan@smallville.com', password: 'senha_errada' })
        .expect(HttpStatus.UNAUTHORIZED)) as EnrichedResponse;

      expect(response.body.message).toBe(
        USER_MESSAGES.EMAIL_OR_PASSWORD_INCORRECT,
      );
    });
  });
});
