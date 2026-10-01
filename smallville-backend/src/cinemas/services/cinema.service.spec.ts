import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpException } from '@nestjs/common';
import mongoose from 'mongoose';

import { Cinema } from '../schema/cinema.schema';
import { SessionsService } from '../../session/services/session.service';
import { MoviesService } from '../../movies/services/movies.service';
import { CINEMA_MESSAGES } from '../messages/cinema.messages';
import { CreateCinemaDto } from '../dtos/create-cinema.dto';
import { CinemaStatus } from '../enums/cinema-status.enum';
import { CinemasService } from './cinema.service';
import { BrazilState } from 'src/common/enums/brazil-states.enum';

describe('CinemasService (Unitário)', () => {
  let service: CinemasService;

  const validId = '64a2b3c4e5f67a8b9c0d1e2f';
  const movieId = '64a2b3c4e5f67a8b9c0d1e30';

  const createMockQuery = <T>(result: T) => ({
    exec: jest.fn().mockResolvedValue(result),
    populate: jest.fn().mockReturnThis(),
  });

  const mockCinemaModel = Object.assign(
    jest.fn().mockImplementation((dto: CreateCinemaDto) => ({
      ...dto,
      movies: [],
      save: jest.fn().mockResolvedValue({
        _id: 'cinema-id',
        ...dto,
      }),
    })),
    {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    },
  );

  const mockSessionsService = {
    findByCinema: jest.fn(),
  };

  const mockMoviesService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCinemaModel.find.mockImplementation(() => createMockQuery([]));
    mockCinemaModel.findOne.mockImplementation(() => createMockQuery(null));
    mockCinemaModel.findById.mockImplementation(() => createMockQuery(null));
    mockCinemaModel.findByIdAndUpdate.mockImplementation(() =>
      createMockQuery(null),
    );
    mockCinemaModel.findByIdAndDelete.mockImplementation(() =>
      createMockQuery(null),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CinemasService,
        {
          provide: getModelToken(Cinema.name),
          useValue: mockCinemaModel,
        },
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
        {
          provide: MoviesService,
          useValue: mockMoviesService,
        },
      ],
    }).compile();

    service = module.get<CinemasService>(CinemasService);
  });

  describe('create', () => {
    const dto: CreateCinemaDto = {
      name: 'Cinemark Shopping Iguatemi',
      address: 'Av. Brigadeiro Faria Lima, 2232',
      city: 'São Paulo',
      state: BrazilState.SP,
      status: CinemaStatus.ATIVO,
    };

    it('deve criar um cinema com sucesso', async () => {
      mockCinemaModel.findOne.mockImplementation(() => createMockQuery(null));

      const result = await service.create(dto);

      expect(result).toHaveProperty('_id', 'cinema-id');
      expect(mockCinemaModel.findOne).toHaveBeenCalledWith({
        name: dto.name,
      });
    });

    it('deve lançar erro se já existir cinema com o mesmo nome', async () => {
      mockCinemaModel.findOne.mockImplementation(() =>
        createMockQuery({ _id: 'existing-id', name: dto.name }),
      );

      await expect(service.create(dto)).rejects.toThrow(
        new HttpException(
          { message: CINEMA_MESSAGES.CINEMA_ALREADY_EXISTS },
          409,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('deve listar todos os cinemas sem filtro', async () => {
      const mockCinemas = [{ _id: '1', name: 'Cine A' }];
      mockCinemaModel.find.mockImplementation(() =>
        createMockQuery(mockCinemas),
      );

      const result = await service.findAll();

      expect(result).toEqual(mockCinemas);
      expect(mockCinemaModel.find).toHaveBeenCalledWith({});
    });

    it('deve filtrar cinemas por nome', async () => {
      const mockCinemas = [{ _id: '1', name: 'Cine A' }];
      mockCinemaModel.find.mockImplementation(() =>
        createMockQuery(mockCinemas),
      );

      await service.findAll('Cine');

      expect(mockCinemaModel.find).toHaveBeenCalledWith({
        name: { $regex: 'Cine', $options: 'i' },
      });
    });
  });

  describe('findOne', () => {
    it('deve lançar erro se o ID for inválido', async () => {
      await expect(service.findOne('id-invalido')).rejects.toThrow(
        new HttpException({ message: CINEMA_MESSAGES.CINEMA_ID_INVALID }, 400),
      );
    });

    it('deve lançar erro se o cinema não for encontrado', async () => {
      mockCinemaModel.findById.mockImplementation(() => createMockQuery(null));

      await expect(service.findOne(validId)).rejects.toThrow(
        new HttpException({ message: CINEMA_MESSAGES.CINEMA_NOT_FOUND }, 404),
      );
    });

    it('deve retornar o cinema encontrado', async () => {
      const mockCinema = { _id: validId, name: 'Cine A', movies: [] };
      mockCinemaModel.findById.mockImplementation(() =>
        createMockQuery(mockCinema),
      );

      const result = await service.findOne(validId);

      expect(result).toEqual(mockCinema);
    });
  });

  describe('details', () => {
    it('deve lançar erro se o cinema não for encontrado', async () => {
      mockCinemaModel.findById.mockImplementation(() => createMockQuery(null));

      await expect(service.details(validId)).rejects.toThrow(
        new HttpException({ message: CINEMA_MESSAGES.CINEMA_NOT_FOUND }, 404),
      );
    });

    it('deve retornar o cinema com filmes populados e sessões', async () => {
      const mockCinema = {
        _id: validId,
        name: 'Cine A',
        address: 'Rua X',
        city: 'São Paulo',
        state: 'SP',
        status: CinemaStatus.ATIVO,
        movies: [{ _id: movieId, title: 'Interestelar' }],
      };

      const mockSessions = [{ _id: 'session-id', movieTitle: 'Interestelar' }];

      mockCinemaModel.findById.mockImplementation(() =>
        createMockQuery(mockCinema),
      );
      mockSessionsService.findByCinema.mockResolvedValue(mockSessions);

      const result = await service.details(validId);

      expect(result).toEqual({
        cinema: {
          id: mockCinema._id,
          name: mockCinema.name,
          address: mockCinema.address,
          city: mockCinema.city,
          state: mockCinema.state,
          status: mockCinema.status,
        },
        movies: mockCinema.movies,
        sessions: mockSessions,
      });

      expect(mockSessionsService.findByCinema).toHaveBeenCalledWith(validId);
    });
  });

  describe('update', () => {
    it('deve atualizar o cinema com sucesso', async () => {
      const updatedCinema = { _id: validId, name: 'Cine Atualizado' };
      mockCinemaModel.findByIdAndUpdate.mockImplementation(() =>
        createMockQuery(updatedCinema),
      );

      const result = await service.update(validId, { name: 'Cine Atualizado' });

      expect(result).toEqual(updatedCinema);
    });

    it('deve lançar erro se o cinema não for encontrado', async () => {
      mockCinemaModel.findByIdAndUpdate.mockImplementation(() =>
        createMockQuery(null),
      );

      await expect(
        service.update(validId, { name: 'Cine Atualizado' }),
      ).rejects.toThrow(
        new HttpException({ message: CINEMA_MESSAGES.CINEMA_NOT_FOUND }, 404),
      );
    });
  });

  describe('remove', () => {
    it('deve remover o cinema com sucesso', async () => {
      mockCinemaModel.findByIdAndDelete.mockImplementation(() =>
        createMockQuery({ _id: validId }),
      );

      await expect(service.remove(validId)).resolves.toBeUndefined();
    });

    it('deve lançar erro se o cinema não for encontrado', async () => {
      mockCinemaModel.findByIdAndDelete.mockImplementation(() =>
        createMockQuery(null),
      );

      await expect(service.remove(validId)).rejects.toThrow(
        new HttpException({ message: CINEMA_MESSAGES.CINEMA_NOT_FOUND }, 404),
      );
    });
  });

  describe('attachMovie', () => {
    it('deve anexar um filme ao cinema com sucesso', async () => {
      const mockCinema = {
        _id: validId,
        movies: [],
        save: jest.fn().mockResolvedValue({
          _id: validId,
          movies: [movieId],
        }),
      };

      mockCinemaModel.findById.mockImplementation(() =>
        createMockQuery(mockCinema),
      );
      mockMoviesService.findOne.mockResolvedValue({ _id: movieId });

      const result = await service.attachMovie(validId, movieId);

      expect(mockMoviesService.findOne).toHaveBeenCalledWith(movieId);
      expect(mockCinema.save).toHaveBeenCalled();
      expect(result).toEqual({ _id: validId, movies: [movieId] });
    });

    it('deve lançar erro se o movieId for inválido', async () => {
      await expect(service.attachMovie(validId, 'id-invalido')).rejects.toThrow(
        new HttpException({ message: CINEMA_MESSAGES.MOVIE_ID_INVALID }, 400),
      );
    });

    it('deve lançar erro se o filme já estiver anexado', async () => {
      const mockCinema = {
        _id: validId,
        movies: [new mongoose.Types.ObjectId(movieId)],
        save: jest.fn(),
      };

      mockCinemaModel.findById.mockImplementation(() =>
        createMockQuery(mockCinema),
      );
      mockMoviesService.findOne.mockResolvedValue({ _id: movieId });

      await expect(service.attachMovie(validId, movieId)).rejects.toThrow(
        new HttpException(
          { message: CINEMA_MESSAGES.MOVIE_ALREADY_ATTACHED },
          409,
        ),
      );

      expect(mockCinema.save).not.toHaveBeenCalled();
    });
  });

  describe('detachMovie', () => {
    it('deve remover um filme do cinema com sucesso', async () => {
      const mockCinema = {
        _id: validId,
        movies: [new mongoose.Types.ObjectId(movieId)],
        save: jest.fn().mockResolvedValue({
          _id: validId,
          movies: [],
        }),
      };

      mockCinemaModel.findById.mockImplementation(() =>
        createMockQuery(mockCinema),
      );

      const result = await service.detachMovie(validId, movieId);

      expect(mockCinema.save).toHaveBeenCalled();
      expect(result).toEqual({ _id: validId, movies: [] });
    });

    it('deve lançar erro se o filme não estiver anexado', async () => {
      const mockCinema = {
        _id: validId,
        movies: [],
        save: jest.fn(),
      };

      mockCinemaModel.findById.mockImplementation(() =>
        createMockQuery(mockCinema),
      );

      await expect(service.detachMovie(validId, movieId)).rejects.toThrow(
        new HttpException({ message: CINEMA_MESSAGES.MOVIE_NOT_ATTACHED }, 404),
      );

      expect(mockCinema.save).not.toHaveBeenCalled();
    });
  });
});
