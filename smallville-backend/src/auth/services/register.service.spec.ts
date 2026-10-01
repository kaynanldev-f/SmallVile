import { Test, TestingModule } from '@nestjs/testing';
import { RegisterService } from './register.service';
import { UserService } from '../../users/service/users.service';
import { CreateUserDto } from '../../users/dtos/create-user.dto';
import { UserGender } from 'src/users/enums/user-gender.enum';
import { BrazilState } from 'src/common/enums/brazil-states.enum';

describe('RegisterService (Unitário)', () => {
  let service: RegisterService;

  const mockUserService = {
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<RegisterService>(RegisterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve mascarar password e role do objeto de retorno ao cadastrar com sucesso', async () => {
      const validDto: CreateUserDto = {
        name: 'Yan',
        surname: 'Monteiro',
        cpf: '529.982.247-25',
        birthDate: '01/01/2000',
        email: 'yan@test.com',
        password: 'Password123@',
        confirmPassword: 'Password123@',
        phone: '(21)99999-9999',
        cep: '20000-000',
        address: 'Rua Teste',
        number: '123',
        complement: 'Apto 101',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: BrazilState.RJ,
        gender: UserGender.MALE,
        termsAccepted: true,
        privacyAccepted: true,
      };

      const mockUserDocument = {
        _id: 'user-id',
        ...validDto,
        role: 'USER',

        toObject: jest.fn().mockReturnValue({
          _id: 'user-id',
          ...validDto,
          role: 'USER',
        }),
      };

      mockUserService.createUser.mockResolvedValue(mockUserDocument);

      const result = await service.register(validDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(validDto);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('role');
      expect(result).not.toHaveProperty('cpf');
    });
  });
});
