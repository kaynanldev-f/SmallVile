import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './session.controller';
import { SessionsService } from '../services/session.service';
import { JwtService } from '@nestjs/jwt';
import { SESSION_MESSAGES } from '../messages/sessions.messages';

describe('SessionsController (Unitário)', () => {
  let controller: SessionsController;
  let service: SessionsService;

  const mockSessionsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByMovieTitle: jest.fn(),
    // O controller devolve a sessão já com preço vigente e situação de
    // venda; nos testes o formato é repassado direto.
    describeForDisplay: jest.fn((session: unknown) => Promise.resolve(session)),
    describeManyForDisplay: jest.fn((sessions: unknown) =>
      Promise.resolve(sessions),
    ),
  };

  const mockJwtService = { verifyAsync: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
    service = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar a lista de sessões com mensagem de sucesso', async () => {
      const mockList = [{ movieTitle: 'Matrix' }];
      mockSessionsService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll();

      expect(jest.spyOn(service, 'findAll')).toHaveBeenCalled();
      expect(result).toEqual({
        message: SESSION_MESSAGES.SESSIONS_FOUND,
        data: mockList,
      });
    });
  });

  describe('findByMovieTitle', () => {
    it('deve retornar as sessões filtradas pelo título do filme', async () => {
      const movieTitle = 'SmallVille: O Filme';
      const mockSessionsList = [
        { movieTitle: 'SmallVille: O Filme', roomName: 'Sala 1' },
        { movieTitle: 'SmallVille: O Filme', roomName: 'Sala 2' },
      ];

      mockSessionsService.findByMovieTitle.mockResolvedValue(mockSessionsList);

      const result = await controller.findByMovieTitle(movieTitle);

      expect(jest.spyOn(service, 'findByMovieTitle')).toHaveBeenCalledWith(
        movieTitle,
      );
      expect(result).toEqual({
        message: SESSION_MESSAGES.SESSIONS_FOUND,
        data: mockSessionsList,
      });
    });
  });
});
