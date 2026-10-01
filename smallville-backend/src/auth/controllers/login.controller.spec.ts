import { Test, TestingModule } from '@nestjs/testing';
import { LoginController } from './login.controller';
import { LoginService } from '../services/login.service';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { LoginDto } from 'src/auth/dtos/login.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('LoginController (Unitário)', () => {
  let controller: LoginController;

  const mockLoginService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoginController],

      providers: [
        {
          provide: LoginService,
          useValue: mockLoginService,
        },
      ],
    }).compile();

    controller = module.get<LoginController>(LoginController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve autenticar o usuário e retornar o token com sucesso', async () => {
    const loginDto: LoginDto = {
      email: 'yan@smallville.com',

      password: 'senha_segura123',
    };

    const mockAuthData = {
      token: 'jwt-token-gerado-aqui',
    };

    mockLoginService.login.mockResolvedValue(mockAuthData);

    const result = await controller.login(loginDto);

    expect(mockLoginService.login).toHaveBeenCalledWith(loginDto);

    expect(result).toEqual({
      message: USER_MESSAGES.LOGIN_SUCCESS,

      data: mockAuthData,
    });
  });

  it('deve propagar a exceção caso o LoginService falhe na autenticação', async () => {
    const loginDto: LoginDto = {
      email: 'yan@smallville.com',

      password: 'senha_errada',
    };

    mockLoginService.login.mockRejectedValue(
      new UnauthorizedException(AUTH_MESSAGES.UNAUTHORIZED),
    );

    await expect(controller.login(loginDto)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(mockLoginService.login).toHaveBeenCalledWith(loginDto);
  });
});
