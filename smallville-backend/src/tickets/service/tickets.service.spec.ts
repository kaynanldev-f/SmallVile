import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TicketsService } from './tickets.service';
import { TicketCodeService } from './ticket-code.service';
import { getModelToken } from '@nestjs/mongoose';
import { Ticket } from '../schema/ticket.schema';
import { Session } from 'src/session/schemas/session.schema';
import { Movie } from 'src/movies/schemas/movie.schema';
import { User } from 'src/users/schemas/users.schema';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { TicketType } from '../enums/ticket-type.enum';
import { UserRole } from 'src/users/enums/user-roles.enum';

describe('TicketsService (Unitário)', () => {
  let service: TicketsService;

  // Criamos uma função simuladora para capturar os retornos do .exec()
  interface QueryMock {
    exec: jest.Mock;
    populate: jest.Mock;
    sort: jest.Mock;
    skip: jest.Mock;
    limit: jest.Mock;
  }

  const mockExec = jest.fn();
  const queryMock: QueryMock = {
    exec: mockExec,
    populate: jest.fn((): QueryMock => queryMock),
    sort: jest.fn((): QueryMock => queryMock),
    skip: jest.fn((): QueryMock => queryMock),
    limit: jest.fn((): QueryMock => queryMock),
  };

  const genericMockModel = {
    find: jest.fn((filter?: Record<string, unknown>): QueryMock => {
      void filter;
      return queryMock;
    }),
    findOne: jest.fn().mockReturnValue(queryMock),
    findById: jest.fn().mockReturnValue(queryMock),
    findByIdAndUpdate: jest.fn().mockReturnValue(queryMock),
    findByIdAndDelete: jest.fn().mockReturnValue(queryMock),
    countDocuments: jest.fn().mockReturnValue(queryMock),
  };

  const ticketCodeServiceMock = {
    generateTicketNumber: jest.fn().mockReturnValue('SMV-20260818-ABCD1234'),
    buildQrPayload: jest.fn().mockReturnValue('SMV-20260818-ABCD1234.ASSINADO'),
  };

  const ownerId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const ticketId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getModelToken(Ticket.name), useValue: genericMockModel },
        { provide: getModelToken(Session.name), useValue: genericMockModel },
        { provide: getModelToken(Movie.name), useValue: genericMockModel },
        { provide: getModelToken(User.name), useValue: genericMockModel },
        { provide: TicketCodeService, useValue: ticketCodeServiceMock },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve lançar erro se a sessão não for encontrada', async () => {
      const dto: CreateTicketDto = {
        sessionId: 'id-sessao-mock',
        seatNumber: 'A1',
        type: TicketType.FULL,
      };
      const mockUserId = 'id-usuario-mock';

      // Promise.all executa dois findById(). O primeiro para User, o segundo para Session.
      // Simulamos encontrando o usuário válido, mas retornando nulo (null) para a sessão.
      mockExec
        .mockResolvedValueOnce({
          _id: mockUserId,
          birthDate: new Date('2000-01-01'),
        }) // Retorno do userModel.findById
        .mockResolvedValueOnce(null); // Retorno do sessionModel.findById

      await expect(service.create(dto, mockUserId)).rejects.toThrow();
    });
  });

  describe('findAllForRequester (regra de visibilidade)', () => {
    beforeEach(() => {
      // Resolve tanto o find() paginado quanto o countDocuments().
      mockExec.mockResolvedValue([]);
    });

    it('deve restringir o usuário comum aos próprios ingressos', async () => {
      await service.findAllForRequester(
        {},
        { userId: ownerId, role: UserRole.USER },
      );

      expect(genericMockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: new Types.ObjectId(ownerId) }),
      );
    });

    it('deve devolver todos os ingressos para o administrador', async () => {
      await service.findAllForRequester(
        {},
        { userId: ownerId, role: UserRole.ADMIN },
      );

      // Sem filtro por usuário: o administrador enxerga o sistema inteiro.
      const filter = genericMockModel.find.mock.calls[0][0];
      expect(filter).not.toHaveProperty('userId');
    });

    it('deve ignorar o filtro por usuário enviado por um usuário comum', async () => {
      await service.findAllForRequester(
        { userId: otherUserId },
        { userId: ownerId, role: UserRole.USER },
      );

      // O filtro continua travado no próprio id, e não no id enviado na query.
      expect(genericMockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: new Types.ObjectId(ownerId) }),
      );
    });

    it('deve aceitar o filtro por usuário quando o requisitante é administrador', async () => {
      await service.findAllForRequester(
        { userId: otherUserId },
        { userId: ownerId, role: UserRole.ADMIN },
      );

      expect(genericMockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: new Types.ObjectId(otherUserId) }),
      );
    });
  });

  describe('findOneForRequester (regra de acesso)', () => {
    const ticketOfOwner = {
      _id: new Types.ObjectId(ticketId),
      userId: new Types.ObjectId(ownerId),
      seatNumber: 'A10',
    };

    it('deve devolver o ingresso para o próprio dono', async () => {
      mockExec.mockResolvedValueOnce(ticketOfOwner);

      const result = await service.findOneForRequester(ticketId, {
        userId: ownerId,
        role: UserRole.USER,
      });

      expect(result).toBe(ticketOfOwner);
    });

    it('deve negar com 403 o acesso ao ingresso de outro usuário', async () => {
      mockExec.mockResolvedValueOnce(ticketOfOwner);

      await expect(
        service.findOneForRequester(ticketId, {
          userId: otherUserId,
          role: UserRole.USER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir que o administrador acesse o ingresso de qualquer usuário', async () => {
      mockExec.mockResolvedValueOnce(ticketOfOwner);

      const result = await service.findOneForRequester(ticketId, {
        userId: otherUserId,
        role: UserRole.ADMIN,
      });

      expect(result).toBe(ticketOfOwner);
    });

    it('deve responder 404 quando o ingresso não existe', async () => {
      mockExec.mockResolvedValueOnce(null);

      await expect(
        service.findOneForRequester(ticketId, {
          userId: ownerId,
          role: UserRole.USER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve responder 404 para um ID inválido, sem consultar o banco', async () => {
      await expect(
        service.findOneForRequester('id-invalido', {
          userId: ownerId,
          role: UserRole.USER,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(genericMockModel.findById).not.toHaveBeenCalled();
    });
  });
});
