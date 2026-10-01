import { Test, TestingModule } from '@nestjs/testing';
import { LoginService } from './login.service';
import { UserService } from 'src/users/service/users.service';
import { AuthService } from 'src/auth/services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { UserRole } from 'src/users/enums/user-roles.enum';
import * as bcrypt from 'bcrypt';

describe('LoginService (Unitário)', () => {
  let service: LoginService;
  let authService: AuthService;

  const mockUserService = {
    findUserByEmail: jest.fn(),
  };

  const mockAuthService = {
    generateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<LoginService>(LoginService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve lançar UnauthorizedException se o e-mail não existir', async () => {
    mockUserService.findUserByEmail.mockResolvedValue(null);

    const loginDto = { email: 'invalido@email.com', password: '123' };

    await expect(service.login(loginDto)).rejects.toThrow(
      new UnauthorizedException({
        message: USER_MESSAGES.EMAIL_OR_PASSWORD_INCORRECT,
      }),
    );
  });

  it('deve retornar o token com sucesso se as credenciais estiverem corretas', async () => {
    const mockUser = {
      _id: 'user-id-123',
      email: 'yan@email.com',
      password: await bcrypt.hash('senha_correta', 10),
      name: 'Yan',
      surname: 'Developer',
      role: UserRole.USER,
    };

    mockUserService.findUserByEmail.mockResolvedValue(mockUser);
    mockAuthService.generateToken.mockReturnValue({
      token: 'jwt-mockado',
    });

    const result = await service.login({
      email: 'yan@email.com',
      password: 'senha_correta',
    });

    expect(jest.spyOn(authService, 'generateToken')).toHaveBeenCalledWith({
      userId: 'user-id-123',
      email: 'yan@email.com',
      name: 'Yan',
      surname: 'Developer',
      role: UserRole.USER,
    });
    expect(result).toEqual({ token: 'jwt-mockado' });
  });
});
