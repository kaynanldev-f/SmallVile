import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './session.service';
import { getModelToken } from '@nestjs/mongoose';
import { MoviesService } from '../../movies/services/movies.service';
import { CinemasService } from '../../cinemas/services/cinema.service';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { Model } from 'mongoose';
import { RoomType } from '../enums/room-type.enum';
import { HttpException } from '@nestjs/common';
import { CINEMA_MESSAGES } from '../../cinemas/messages/cinema.messages';
import { SESSION_MESSAGES } from '../messages/sessions.messages';
import { Session, SessionDocument } from '../schemas/session.schema';
import { MovieLanguage } from 'src/movies/enums/movie-language.enum';
import { Order } from 'src/orders/schemas/order.schema';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { TicketPricingService } from 'src/sales-control/services/ticket-pricing.service';

describe('SessionsService (Unitário)', () => {
  let service: SessionsService;

  const validCinemaId = '64a2b3c4e5f67a8b9c0d1e2f';

  /**
   * Helpers para manter as datas dos testes sempre relativas ao momento
   * em que o teste é executado.
   */
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (
    date: Date,
    hours: number,
    minutes: number,
  ): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${day}/${month}/${year} ${formattedHours}:${formattedMinutes}`;
  };

  const now = new Date();

  // Data futura usada pelos testes de criação.
  // Mantemos uma margem confortável para que os testes nunca caiam no passado.
  const futureSessionDate = addDays(now, 7);

  // Data futura usada exclusivamente nos testes de estreia.
  // Todos os cenários abaixo são derivados dela.
  const movieReleaseDate = addDays(now, 10);

  const futureSessionDateTime = formatDateTime(
    futureSessionDate,
    20,
    30,
  );

  const movieReleaseDateFormatted = formatDate(movieReleaseDate);
  const sessionBeforeRelease = formatDateTime(
    addDays(movieReleaseDate, -1),
    23,
    59,
  );
  const sessionOnRelease = formatDateTime(movieReleaseDate, 0, 10);
  const sessionAfterRelease = formatDateTime(
    addDays(movieReleaseDate, 1),
    20,
    30,
  );

  const mockSessionModel = jest
    .fn()
    .mockImplementation((sessionData: CreateSessionDto) => ({
      ...sessionData,
      save: jest.fn().mockResolvedValue({
        _id: 'session-id',
        ...sessionData,
      }),
    }));

  const mockExec = jest.fn();

  const queryMock = {
    exec: mockExec,
    select: jest.fn().mockReturnThis(),
  };

  const mockFind = jest.fn().mockReturnValue(queryMock);
  const mockFindOne = jest.fn().mockReturnValue(queryMock);
  const mockFindById = jest.fn().mockReturnValue(queryMock);
  const mockFindByIdAndUpdate = jest.fn().mockReturnValue(queryMock);
  const mockFindByIdAndDelete = jest.fn().mockReturnValue(queryMock);
  const mockFindOneAndDelete = jest.fn().mockReturnValue(queryMock);

  Object.assign(mockSessionModel, {
    find: mockFind,
    findOne: mockFindOne,
    findById: mockFindById,
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findByIdAndDelete: mockFindByIdAndDelete,
    findOneAndDelete: mockFindOneAndDelete,
  });

  const mockSessionModelProvider =
    mockSessionModel as unknown as jest.Mocked<Model<SessionDocument>>;

  const mockMoviesService = {
    findByTitle: jest.fn(),
  };

  const mockCinemasService = {
    findOne: jest.fn(),
  };

  const mockOrderModel = {
    distinct: jest.fn(() => ({
      exec: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockNotificationsService = {
    notifyUser: jest.fn(),
    notifyAdmins: jest.fn(),
  };

  const mockPricingService = {
    resolveForSession: jest.fn().mockResolvedValue({
      fullPrice: 3000,
      halfPrice: 1500,
      source: 'padrao',
    }),
    describeAvailability: jest.fn().mockReturnValue({
      enabled: true,
      onSale: true,
      startsAt: null,
      endsAt: null,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getModelToken(Session.name),
          useValue: mockSessionModelProvider,
        },
        {
          provide: MoviesService,
          useValue: mockMoviesService,
        },
        {
          provide: CinemasService,
          useValue: mockCinemasService,
        },
        // Só leitura, para descobrir quem comprou a sessão alterada.
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: TicketPricingService,
          useValue: mockPricingService,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve gerar assentos padrão se nenhum for enviado', async () => {
      const sessionDto: CreateSessionDto = {
        cinemaId: validCinemaId,
        movieTitle: 'Interestelar',
        roomName: 'Sala IMAX',
        roomType: RoomType.THREE_D,
        price: 30,
        dateTime: futureSessionDateTime,
        language: MovieLanguage.DUBBED,
      };

      mockCinemasService.findOne.mockResolvedValue({
        _id: validCinemaId,
        movies: ['movie-id'],
      });

      mockMoviesService.findByTitle.mockResolvedValue({
        _id: 'movie-id',
        languages: [MovieLanguage.DUBBED, MovieLanguage.SUBTITLED],
      });

      const result = await service.create(sessionDto);

      expect(mockCinemasService.findOne).toHaveBeenCalledWith(validCinemaId);
      expect(result).toHaveProperty('_id', 'session-id');
    });

    it('deve lançar erro se o cinemaId for inválido', async () => {
      const sessionDto: CreateSessionDto = {
        cinemaId: 'id-invalido',
        movieTitle: 'Interestelar',
        roomName: 'Sala IMAX',
        roomType: RoomType.THREE_D,
        price: 30,
        dateTime: futureSessionDateTime,
        language: MovieLanguage.DUBBED,
      };

      await expect(service.create(sessionDto)).rejects.toThrow(
        new HttpException(
          { message: CINEMA_MESSAGES.CINEMA_ID_INVALID },
          400,
        ),
      );

      expect(mockMoviesService.findByTitle).not.toHaveBeenCalled();
    });

    it('deve lançar erro se o filme não for encontrado', async () => {
      const sessionDto: CreateSessionDto = {
        cinemaId: validCinemaId,
        movieTitle: 'Filme Inexistente',
        roomName: 'Sala IMAX',
        roomType: RoomType.THREE_D,
        price: 30,
        dateTime: futureSessionDateTime,
        language: MovieLanguage.DUBBED,
      };

      mockCinemasService.findOne.mockResolvedValue({
        _id: validCinemaId,
        movies: [],
      });

      mockMoviesService.findByTitle.mockResolvedValue(null);

      await expect(service.create(sessionDto)).rejects.toThrow(
        'Não é possível criar uma sessão para um filme não cadastrado.',
      );
    });

    it('deve lançar erro se o filme não estiver atrelado ao cinema', async () => {
      const sessionDto: CreateSessionDto = {
        cinemaId: validCinemaId,
        movieTitle: 'Interestelar',
        roomName: 'Sala IMAX',
        roomType: RoomType.THREE_D,
        price: 30,
        dateTime: futureSessionDateTime,
        language: MovieLanguage.DUBBED,
      };

      mockCinemasService.findOne.mockResolvedValue({
        _id: validCinemaId,
        movies: ['outro-id-de-filme'],
      });

      mockMoviesService.findByTitle.mockResolvedValue({
        _id: 'movie-id',
        languages: [MovieLanguage.DUBBED],
      });

      await expect(service.create(sessionDto)).rejects.toThrow(
        'Este filme não está em cartaz no cinema selecionado.',
      );
    });

    it('deve lançar erro se o idioma não estiver disponível para o filme', async () => {
      const sessionDto: CreateSessionDto = {
        cinemaId: validCinemaId,
        movieTitle: 'Interestelar',
        roomName: 'Sala IMAX',
        roomType: RoomType.THREE_D,
        price: 30,
        dateTime: futureSessionDateTime,
        language: MovieLanguage.SUBTITLED,
      };

      mockCinemasService.findOne.mockResolvedValue({
        _id: validCinemaId,
        movies: ['movie-id'],
      });

      mockMoviesService.findByTitle.mockResolvedValue({
        _id: 'movie-id',
        languages: [MovieLanguage.DUBBED],
      });

      await expect(service.create(sessionDto)).rejects.toThrow(
        'Este idioma não está disponível para este filme.',
      );
    });

    describe('data de estreia do filme', () => {
      const baseDto = {
        cinemaId: validCinemaId,
        movieTitle: 'Interestelar',
        roomName: 'Sala IMAX',
        roomType: RoomType.THREE_D,
        price: 30,
        language: MovieLanguage.DUBBED,
      };

      const mockMovieReleasedOn = (releaseDate: string) => {
        mockCinemasService.findOne.mockResolvedValue({
          _id: validCinemaId,
          movies: ['movie-id'],
        });

        mockMoviesService.findByTitle.mockResolvedValue({
          _id: 'movie-id',
          title: 'Interestelar',
          releaseDate,
          languages: [MovieLanguage.DUBBED],
        });
      };

      it('recusa a sessão marcada para a véspera da estreia', async () => {
        mockMovieReleasedOn(movieReleaseDateFormatted);

        await expect(
          service.create({
            ...baseDto,
            dateTime: sessionBeforeRelease,
          }),
        ).rejects.toThrow(
          SESSION_MESSAGES.SESSION_BEFORE_MOVIE_RELEASE(
            movieReleaseDateFormatted,
          ),
        );
      });

      it('aceita a sessão no próprio dia da estreia, em qualquer horário', async () => {
        mockMovieReleasedOn(movieReleaseDateFormatted);

        const result = await service.create({
          ...baseDto,
          dateTime: sessionOnRelease,
        });

        expect(result).toHaveProperty('_id', 'session-id');
      });

      it('aceita a sessão depois da estreia', async () => {
        mockMovieReleasedOn(movieReleaseDateFormatted);

        const result = await service.create({
          ...baseDto,
          dateTime: sessionAfterRelease,
        });

        expect(result).toHaveProperty('_id', 'session-id');
      });

      it('grava o título como está no catálogo, e não como foi digitado', async () => {
        mockMovieReleasedOn(movieReleaseDateFormatted);

        const result = (await service.create({
          ...baseDto,
          movieTitle: 'interestelar',
          dateTime: sessionAfterRelease,
        })) as unknown as { movieTitle: string };

        expect(result.movieTitle).toBe('Interestelar');
      });

      it('não bloqueia o cadastro quando o filme não tem data de estreia legível', async () => {
        mockMovieReleasedOn('sem data');

        const result = await service.create({
          ...baseDto,
          dateTime: sessionAfterRelease,
        });

        expect(result).toHaveProperty('_id', 'session-id');
      });
    });
  });

  describe('findByCinema', () => {
    it('deve lançar erro se o cinemaId for inválido', async () => {
      await expect(service.findByCinema('id-invalido')).rejects.toThrow(
        new HttpException(
          { message: CINEMA_MESSAGES.CINEMA_ID_INVALID },
          400,
        ),
      );
    });

    it('deve retornar as sessões do cinema sem os seats', async () => {
      const mockSessions = [
        {
          _id: 'session-id',
          cinemaId: validCinemaId,
          movieTitle: 'Interestelar',
        },
      ];

      mockExec.mockResolvedValue(mockSessions);

      const result = await service.findByCinema(validCinemaId);

      expect(mockFind).toHaveBeenCalledWith({
        cinemaId: validCinemaId,
      });

      expect(queryMock.select).toHaveBeenCalledWith('-seats');
      expect(result).toEqual(mockSessions);
    });
  });
});
