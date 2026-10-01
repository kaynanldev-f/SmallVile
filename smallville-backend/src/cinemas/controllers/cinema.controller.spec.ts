import { Test, TestingModule } from '@nestjs/testing';

import { CinemasService } from '../services/cinema.service';
import { CINEMA_MESSAGES } from '../messages/cinema.messages';
import { CreateCinemaDto } from '../dtos/create-cinema.dto';
import { CinemaStatus } from '../enums/cinema-status.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CinemasController } from './cinema.controller';
import { BrazilState } from 'src/common/enums/brazil-states.enum';

describe('CinemasController (Unitário)', () => {
  let controller: CinemasController;

  const mockCinemasService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    details: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    attachMovie: jest.fn(),
    detachMovie: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CinemasController],
      providers: [
        {
          provide: CinemasService,
          useValue: mockCinemasService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CinemasController>(CinemasController);
  });

  describe('create', () => {
    it('deve criar um cinema com sucesso', async () => {
      const dto: CreateCinemaDto = {
        name: 'Cinemark Shopping Iguatemi',
        address: 'Av. Brigadeiro Faria Lima, 2232',
        city: 'São Paulo',
        state: BrazilState.SP,
        status: CinemaStatus.ATIVO,
      };

      const mockCinema = { _id: 'cinema-id', ...dto };
      mockCinemasService.create.mockResolvedValue(mockCinema);

      const result = await controller.create(dto);

      expect(result).toEqual({
        message: CINEMA_MESSAGES.CINEMA_CREATED,
        data: mockCinema,
      });
    });
  });

  describe('findAll', () => {
    it('deve listar todos os cinemas', async () => {
      const mockCinemas = [{ _id: '1', name: 'Cine A' }];
      mockCinemasService.findAll.mockResolvedValue(mockCinemas);

      const result = await controller.findAll();

      expect(result).toEqual({
        message: CINEMA_MESSAGES.CINEMA_FOUND,
        data: mockCinemas,
      });
      expect(mockCinemasService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('deve filtrar cinemas por nome', async () => {
      const mockCinemas = [{ _id: '1', name: 'Cine A' }];
      mockCinemasService.findAll.mockResolvedValue(mockCinemas);

      await controller.findAll('Cine');

      expect(mockCinemasService.findAll).toHaveBeenCalledWith('Cine');
    });
  });

  describe('findOne', () => {
    it('deve buscar um cinema por ID', async () => {
      const mockCinema = { _id: 'cinema-id', name: 'Cine A' };
      mockCinemasService.findOne.mockResolvedValue(mockCinema);

      const result = await controller.findOne('cinema-id');

      expect(result).toEqual({
        message: CINEMA_MESSAGES.CINEMA_FOUND,
        data: mockCinema,
      });
    });
  });

  describe('details', () => {
    it('deve retornar os detalhes do cinema com filmes e sessões', async () => {
      const mockDetails = {
        cinema: { id: 'cinema-id', name: 'Cine A' },
        movies: [{ _id: 'movie-id', title: 'Interestelar' }],
        sessions: [{ _id: 'session-id' }],
      };

      mockCinemasService.details.mockResolvedValue(mockDetails);

      const result = await controller.details('cinema-id');

      expect(result).toEqual({
        message: CINEMA_MESSAGES.CINEMA_FOUND,
        data: mockDetails,
      });
    });
  });

  describe('update', () => {
    it('deve atualizar um cinema com sucesso', async () => {
      const mockUpdated = { _id: 'cinema-id', name: 'Cine Atualizado' };
      mockCinemasService.update.mockResolvedValue(mockUpdated);

      const result = await controller.update('cinema-id', {
        name: 'Cine Atualizado',
      });

      expect(result).toEqual({
        message: CINEMA_MESSAGES.CINEMA_UPDATED,
        data: mockUpdated,
      });
    });
  });

  describe('remove', () => {
    it('deve remover um cinema com sucesso', async () => {
      mockCinemasService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('cinema-id');

      expect(result).toEqual({
        message: CINEMA_MESSAGES.CINEMA_DELETED,
      });
    });
  });

  describe('attachMovie', () => {
    it('deve anexar um filme ao cinema', async () => {
      const mockCinema = { _id: 'cinema-id', movies: ['movie-id'] };
      mockCinemasService.attachMovie.mockResolvedValue(mockCinema);

      const result = await controller.attachMovie('cinema-id', 'movie-id');

      expect(result).toEqual({
        message: CINEMA_MESSAGES.MOVIE_ATTACHED,
        data: mockCinema,
      });
      expect(mockCinemasService.attachMovie).toHaveBeenCalledWith(
        'cinema-id',
        'movie-id',
      );
    });
  });

  describe('detachMovie', () => {
    it('deve remover um filme do cinema', async () => {
      const mockCinema = { _id: 'cinema-id', movies: [] };
      mockCinemasService.detachMovie.mockResolvedValue(mockCinema);

      const result = await controller.detachMovie('cinema-id', 'movie-id');

      expect(result).toEqual({
        message: CINEMA_MESSAGES.MOVIE_DETACHED,
        data: mockCinema,
      });
      expect(mockCinemasService.detachMovie).toHaveBeenCalledWith(
        'cinema-id',
        'movie-id',
      );
    });
  });
});
