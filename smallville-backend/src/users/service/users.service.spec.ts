import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { UserService } from './users.service';
import { User } from '../schemas/users.schema';
import { CreateUserDto } from '../dtos/create-user.dto';
import { BrazilState } from 'src/common/enums/brazil-states.enum';

describe('UserService (Unitário)', () => {
  let service: UserService;

  const createMockQuery = <T>(result: T) => ({
    exec: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  });

  const mockUserModel = Object.assign(
    jest.fn().mockImplementation((dto: CreateUserDto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        _id: 'user-id',
        ...dto,
      }),
    })),
    {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    },
  );

  beforeEach(async () => {
    jest.clearAllMocks();

    // Métodos que no service usam .exec()
    mockUserModel.find.mockImplementation(() => createMockQuery([]));

    mockUserModel.findById.mockImplementation(() => createMockQuery(null));

    mockUserModel.findByIdAndUpdate.mockImplementation(() =>
      createMockQuery(null),
    );

    mockUserModel.findByIdAndDelete.mockImplementation(() =>
      createMockQuery(null),
    );

    mockUserModel.countDocuments.mockImplementation(() => createMockQuery(0));

    // No createUser o service usa findOne() direto, sem .exec()
    mockUserModel.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('createUser', () => {
    it('deve cadastrar um novo usuário com sucesso', async () => {
      const dto: CreateUserDto = {
        name: 'Yan',
        surname: 'Silva',
        email: 'yan@test.com',
        cpf: '529.982.247-25',
        birthDate: '01/01/2000',
        password: 'Password123@',
        confirmPassword: 'Password123@',
        phone: '(41)99999-9999',
        cep: '80010-000',
        address: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: BrazilState.PR,
        termsAccepted: true,
        privacyAccepted: true,
      };

      const result = await service.createUser(dto);

      expect(result).toHaveProperty('_id', 'user-id');
      expect(mockUserModel.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAllUsers', () => {
    it('deve retornar usuários paginados com os metadados corretos', async () => {
      const mockUsers = [
        { _id: '1', name: 'Manoel' },
        { _id: '2', name: 'Yan' },
      ];

      mockUserModel.find.mockImplementation(() => createMockQuery(mockUsers));
      mockUserModel.countDocuments.mockImplementation(() => createMockQuery(2));

      const result = await service.findAllUsers(1, 10);

      expect(result).toEqual({
        users: mockUsers,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('deve usar valores default de page e limit quando não informados', async () => {
      mockUserModel.find.mockImplementation(() => createMockQuery([]));
      mockUserModel.countDocuments.mockImplementation(() => createMockQuery(0));

      const result = await service.findAllUsers();

      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('deve calcular totalPages corretamente com resto', async () => {
      mockUserModel.find.mockImplementation(() => createMockQuery([]));
      mockUserModel.countDocuments.mockImplementation(() =>
        createMockQuery(25),
      );

      const result = await service.findAllUsers(2, 10);

      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });
  });
});
