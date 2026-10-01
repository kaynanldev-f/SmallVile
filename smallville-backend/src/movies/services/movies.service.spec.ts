import { Test, TestingModule } from '@nestjs/testing';
import { MoviesService } from './movies.service';
import { getModelToken } from '@nestjs/mongoose';
import { Movie, MovieDocument } from '../schemas/movie.schema';
import { SessionsService } from '../../session/services/session.service';
import { CinemasService } from '../../cinemas/services/cinema.service';
import { MOVIE_MESSAGES } from '../messages/movies.message';
import { HttpException, HttpStatus } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { CreateMovieDto } from '../dtos/create-movie.dto';
import { Classification } from '../enums/classification.enum';
import { MovieGenres } from '../enums/movie-genres.enum';
import { MovieLanguage } from '../enums/movie-language.enum';

describe('MoviesService (Unitário)', () => {
  let service: MoviesService;

  const mockMovieModel = jest
    .fn()
    .mockImplementation((dto: CreateMovieDto) => ({
      ...dto,
      title: dto.title ? dto.title.trim() : '',
      save: jest.fn().mockResolvedValue({
        _id: 'movie-id',
        ...dto,
      }),
    }));

  const mockExec = jest.fn();

  const queryMock = {
    exec: mockExec,
  };

  Object.assign(mockMovieModel, {
    find: jest.fn().mockReturnValue(queryMock),
    findOne: jest.fn().mockReturnValue(queryMock),
    findById: jest.fn().mockReturnValue(queryMock),
    findByIdAndUpdate: jest.fn().mockReturnValue(queryMock),
    findByIdAndDelete: jest.fn().mockReturnValue(queryMock),
  });

  const mockSessionsService = {
    findByMovie: jest.fn(),
  };

  const mockCinemasService = {
    findManyByIds: jest.fn().mockResolvedValue([]),
  };

  const mockMovieModelProvider = mockMovieModel as unknown as jest.Mocked<
    Model<MovieDocument>
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        {
          provide: getModelToken(Movie.name),
          useValue: mockMovieModelProvider,
        },
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
        {
          provide: CinemasService,
          useValue: mockCinemasService,
        },
      ],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve salvar e retornar um filme com sucesso', async () => {
      const dto: CreateMovieDto = {
        title: 'Interestelar',
        banner: 'https://image.com/banner.jpg',
        synopsis: 'Um filme sobre viagem no espaço.',
        genres: [MovieGenres.ACTION, MovieGenres.ADVENTURE],
        classification: Classification.ANOS_12,
        duration: 169,
        author: 'Christopher Nolan',
        cast: [
          {
            name: 'Matthew McConaughey',
            imageUrl: 'https://image.com/actor1.jpg',
          },
          { name: 'Anne Hathaway', imageUrl: 'https://image.com/actor2.jpg' },
        ],
        trailer: 'https://youtube.com/trailer',
        releaseDate: '07/11/2014',
        languages: [MovieLanguage.DUBBED],
      };

      mockExec.mockResolvedValueOnce(null);

      const result = await service.create(dto);

      expect(result).toHaveProperty('_id', 'movie-id');
      expect(result).toHaveProperty('cast');
      expect(result.cast[0].name).toBe('Matthew McConaughey');
    });
  });

  describe('details', () => {
    const validId = new mongoose.Types.ObjectId().toString();

    it('deve lançar erro se o ID enviado for inválido', async () => {
      await expect(service.details('id-invalido')).rejects.toThrow(
        new HttpException(
          {
            message: MOVIE_MESSAGES.MOVIE_ID_INVALID,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('deve retornar o filme estruturado junto com suas sessões', async () => {
      const mockMovieData = {
        _id: new mongoose.Types.ObjectId(validId),
        title: 'Matrix',
        synopsis: 'Sci-fi classic',
        banner: 'banner.png',
        genres: ['Sci-Fi'],
        classification: '12',
        duration: 136,
        author: 'Wachowskis',
        cast: [
          { name: 'Keanu Reeves', imageUrl: 'https://image.com/actor1.jpg' },
          {
            name: 'Laurence Fishburne',
            imageUrl: 'https://image.com/actor2.jpg',
          },
        ],
        trailer: 'url',
        releaseDate: '1999',
        languages: ['pt'],
      };

      const mockSessions = [
        {
          roomName: 'Sala 1',
          price: 20,
        },
      ];

      mockExec.mockResolvedValue(mockMovieData);
      mockSessionsService.findByMovie.mockResolvedValue(mockSessions);

      const result = await service.details(validId);

      expect(mockSessionsService.findByMovie).toHaveBeenCalledWith(validId);
      expect(result).toHaveProperty('movie');
      expect(result.movie.cast).toEqual(mockMovieData.cast);
      expect(result.sessions).toEqual(mockSessions);
    });

    describe('filtro de cidade', () => {
      const spCinemaId = new mongoose.Types.ObjectId().toString();
      const rjCinemaId = new mongoose.Types.ObjectId().toString();

      const spSession = {
        _id: 's1',
        cinemaId: spCinemaId,
        roomName: 'Sala 1',
        dateTime: '21/08/2026 20:30',
      };
      const spLaterSession = {
        _id: 's3',
        cinemaId: spCinemaId,
        roomName: 'Sala 1',
        dateTime: '22/08/2026 18:00',
      };
      const rjSession = {
        _id: 's2',
        cinemaId: rjCinemaId,
        roomName: 'Sala 2',
        dateTime: '21/08/2026 21:00',
      };

      beforeEach(() => {
        mockExec.mockResolvedValue({
          _id: new mongoose.Types.ObjectId(validId),
          title: 'Matrix',
          cast: [],
          releaseDate: '31/03/1999',
        });

        mockSessionsService.findByMovie.mockResolvedValue([
          spLaterSession,
          spSession,
          rjSession,
        ]);

        mockCinemasService.findManyByIds.mockResolvedValue([
          {
            _id: spCinemaId,
            name: 'Cinemark Ibirapuera',
            address: 'Av. Ibirapuera, 3103',
            city: 'São Paulo',
            state: 'SP',
          },
          {
            _id: rjCinemaId,
            name: 'Cinemark Barra',
            address: 'Av. das Américas, 4666',
            city: 'Rio de Janeiro',
            state: 'RJ',
          },
        ]);
      });

      it('sem cidade, devolve todas as sessões e a lista de cidades', async () => {
        const result = await service.details(validId);

        expect(result.sessions).toHaveLength(3);
        expect(result.cities).toEqual(['Rio de Janeiro', 'São Paulo']);
        expect(result.selectedCity).toBeNull();
        expect(result.cinemas).toHaveLength(2);
      });

      it('com cidade, devolve só as sessões dos cinemas daquela cidade', async () => {
        const result = await service.details(validId, 'São Paulo');

        expect(result.sessions).toEqual([spLaterSession, spSession]);
        expect(result.cinemas).toHaveLength(1);
        expect(result.cinemas[0].city).toBe('São Paulo');
        expect(result.selectedCity).toBe('São Paulo');
      });

      it('casa a cidade ignorando caixa e acentuação', async () => {
        const result = await service.details(validId, 'sao paulo');

        expect(result.sessions).toEqual([spLaterSession, spSession]);
        expect(result.selectedCity).toBe('São Paulo');
      });

      it('mantém o seletor abastecido quando a cidade não tem sessão', async () => {
        const result = await service.details(validId, 'Curitiba');

        expect(result.sessions).toEqual([]);
        expect(result.cinemas).toEqual([]);
        expect(result.cities).toEqual(['Rio de Janeiro', 'São Paulo']);
        expect(result.selectedCity).toBeNull();
      });

      it('devolve os dias da cidade escolhida em ordem cronológica', async () => {
        const result = await service.details(validId, 'São Paulo');

        expect(result.dates).toEqual(['21/08/2026', '22/08/2026']);
      });

      it('combina o filtro de cidade com o de dia', async () => {
        const result = await service.details(
          validId,
          'São Paulo',
          '21/08/2026',
        );

        expect(result.sessions).toEqual([spSession]);
        expect(result.selectedCity).toBe('São Paulo');
        expect(result.selectedDate).toBe('21/08/2026');
        // A régua de dias não encolhe por causa do dia escolhido.
        expect(result.dates).toEqual(['21/08/2026', '22/08/2026']);
      });

      it('aceita o dia junto com o horário, como vem de `dateTime`', async () => {
        const result = await service.details(
          validId,
          'São Paulo',
          '22/08/2026 18:00',
        );

        expect(result.sessions).toEqual([spLaterSession]);
      });
    });
  });
});
