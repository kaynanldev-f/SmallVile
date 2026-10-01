import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from '../service/tickets.service';
import { JwtService } from '@nestjs/jwt';
import { TicketType } from '../enums/ticket-type.enum';
import { TICKETS_MESSAGES } from '../messages/tickets.message';
import { AuthRequest } from 'src/auth/guards/auth.guard';
import { UserRole } from 'src/users/enums/user-roles.enum';

describe('TicketsController (Unitário)', () => {
  let controller: TicketsController;
  let service: TicketsService;

  const mockTicketsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
  };

  const mockJwtService = { verifyAsync: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve chamar o service passando o userId do token e retornar a resposta estruturada', async () => {
      const dto = {
        sessionId: 'session-id',
        seatNumber: 'A1',
        type: TicketType.FULL,
      };
      const mockReq = {
        user: { sub: 'user-id-123', role: UserRole.USER },
      } as AuthRequest;
      const mockCreatedTicket = {
        _id: 'ticket-id',
        ...dto,
        userId: 'user-id-123',
      };

      mockTicketsService.create.mockResolvedValue(mockCreatedTicket);

      const result = await controller.create(dto, mockReq);

      expect(jest.spyOn(service, 'create')).toHaveBeenCalledWith(
        dto,
        'user-id-123',
      );
      expect(result).toEqual({
        message: TICKETS_MESSAGES.TICKET_CREATED,
        data: mockCreatedTicket,
      });
    });
  });

  describe('findMyTickets', () => {
    it('deve retornar apenas os tickets do usuário logado', async () => {
      const mockReq = {
        user: { sub: 'my-user-id', role: UserRole.USER },
      } as AuthRequest;
      const mockList = [{ _id: 't1' }];
      mockTicketsService.findByUser.mockResolvedValue(mockList);

      const result = await controller.findMyTickets(mockReq);

      expect(jest.spyOn(service, 'findByUser')).toHaveBeenCalledWith(
        'my-user-id',
      );
      expect(result).toEqual({
        message: TICKETS_MESSAGES.TICKETS_FOUND,
        data: mockList,
      });
    });
  });
});
