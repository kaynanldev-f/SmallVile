import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './users.controller';
import { UserService } from '../service/users.service';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/user-roles.enum';
import { USER_MESSAGES } from '../messages/users.message';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { AuthRequest } from 'src/auth/guards/auth.guard';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

describe('UserController (Unitário)', () => {
  let controller: UserController;

  const mockUserService = {
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('deve listar usuários paginados com sucesso', async () => {
      const mockUsers = [
        {
          name: 'Manoel',
          email: 'manoel@email.com',
        },
      ];

      const mockMeta = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockUserService.findAllUsers.mockResolvedValue({
        users: mockUsers,
        meta: mockMeta,
      });

      const paginationQuery: PaginationQueryDto = { page: 1, limit: 10 };

      const result = await controller.getAll(paginationQuery);

      expect(result).toEqual({
        message: USER_MESSAGES.USERS_FOUND,
        data: mockUsers,
        meta: mockMeta,
      });

      expect(mockUserService.findAllUsers).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('findById', () => {
    const targetId = '696a775b7369b60210df7b26';

    it('deve permitir acesso se for o dono (Owner)', async () => {
      const mockUser = {
        _id: targetId,
        name: 'Manoel',
      };

      mockUserService.findUserById.mockResolvedValue(mockUser);

      const mockReq = {
        user: {
          sub: targetId,
          role: UserRole.USER,
        },
      } as unknown as AuthRequest;

      const result = await controller.findById(targetId, mockReq);

      expect(result).toEqual({
        message: USER_MESSAGES.USER_FOUND,
        data: mockUser,
      });
    });

    it('deve permitir acesso se for ADMIN', async () => {
      const mockUser = {
        _id: targetId,
        name: 'Manoel',
      };

      mockUserService.findUserById.mockResolvedValue(mockUser);

      const mockReq = {
        user: {
          sub: 'outro-id',
          role: UserRole.ADMIN,
        },
      } as unknown as AuthRequest;

      const result = await controller.findById(targetId, mockReq);

      expect(result).toEqual({
        message: USER_MESSAGES.USER_FOUND,
        data: mockUser,
      });
    });

    it('deve lançar ForbiddenException se não for dono e nem ADMIN', async () => {
      const mockReq = {
        user: {
          sub: 'outro-id',
          role: UserRole.USER,
        },
      } as unknown as AuthRequest;

      await expect(controller.findById(targetId, mockReq)).rejects.toThrow(
        new ForbiddenException(AUTH_MESSAGES.FORBIDDEN),
      );
    });
  });

  describe('update', () => {
    const targetId = '696a775b7369b60210df7b26';

    const dto: UpdateUserDto = {
      name: 'Manoel Alterado',
    };

    it('deve atualizar se for dono', async () => {
      const mockUpdated = {
        _id: targetId,
        name: 'Manoel Alterado',
      };

      mockUserService.updateUser.mockResolvedValue(mockUpdated);

      const mockReq = {
        user: {
          sub: targetId,
          role: UserRole.USER,
        },
      } as unknown as AuthRequest;

      const result = await controller.update(targetId, dto, mockReq);

      expect(result).toEqual({
        message: USER_MESSAGES.USER_UPDATED,
        data: mockUpdated,
      });
    });
  });

  describe('delete', () => {
    const targetId = '696a775b7369b60210df7b26';

    it('deve deletar se for ADMIN', async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined);

      const mockReq = {
        user: {
          sub: 'admin-id',
          role: UserRole.ADMIN,
        },
      } as unknown as AuthRequest;

      const result = await controller.delete(targetId, mockReq);

      expect(result).toEqual({
        message: USER_MESSAGES.USER_DELETED,
      });
    });
  });
});
