import { Test, TestingModule } from '@nestjs/testing';
import { RegisterController } from './register.controller';
import { RegisterService } from '../services/register.service';
import { JwtService } from '@nestjs/jwt';
import { USER_MESSAGES } from '../../users/messages/users.message';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import { ConflictException } from '@nestjs/common';

describe('RegisterController (Unitário)', () => {
  let controller: RegisterController;

  const mockRegisterService = {
    register: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegisterController],

      providers: [
        {
          provide: RegisterService,
          useValue: mockRegisterService,
        },

        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<RegisterController>(RegisterController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve chamar o RegisterService enviando os dados e retornar sucesso', async () => {
    const dto = {
      name: 'Yan',

      email: 'test@test.com',

      password: '123',

      confirmPassword: '123',

      cpf: '123-456-789-01',
    } as CreateUserDto;

    const mockRegisteredUser = {
      id: 'uuid-gerado',

      name: 'Yan',

      email: 'test@test.com',

      cpf: 'hash_do_cpf_aqui',
    };

    mockRegisterService.register.mockResolvedValue(mockRegisteredUser);

    const result = await controller.registerUser(dto);

    expect(mockRegisterService.register).toHaveBeenCalledWith(dto);

    expect(result).toEqual({
      message: USER_MESSAGES.REGISTRATION_SUCCESS,

      data: mockRegisteredUser,
    });
  });

  it('deve propagar erro de conflito caso o usuário já esteja registrado', async () => {
    const dto = {
      name: 'Yan',

      email: 'test@test.com',

      password: '123',

      confirmPassword: '123',

      cpf: '12345678901',
    } as CreateUserDto;

    mockRegisterService.register.mockRejectedValue(
      new ConflictException(USER_MESSAGES.USER_ALREADY_REGISTERED),
    );

    await expect(controller.registerUser(dto)).rejects.toThrow(
      ConflictException,
    );

    expect(mockRegisterService.register).toHaveBeenCalledWith(dto);
  });
});
