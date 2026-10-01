import { Test, TestingModule } from '@nestjs/testing';
import { MoviesController } from './movies.controller';
import { MoviesService } from '../services/movies.service';
import { JwtService } from '@nestjs/jwt';
import { MOVIE_MESSAGES } from '../messages/movies.message';
import { StorageService } from 'src/storage/storage.service';

describe('MoviesController (Unitário)', () => {
  let controller: MoviesController;
  let service: MoviesService;

  const mockMoviesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    details: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtService = { verifyAsync: jest.fn() };

  // Criamos o mock para o StorageService
  const mockStorageService = {
    uploadFile: jest
      .fn()
      .mockResolvedValue({ url: 'https://fakeimage.com/banner.jpg' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        { provide: MoviesService, useValue: mockMoviesService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: StorageService, useValue: mockStorageService }, // Injetado aqui
      ],
    }).compile();

    controller = module.get<MoviesController>(MoviesController);
    service = module.get<MoviesService>(MoviesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar lista de filmes com mensagem de sucesso', async () => {
      const list = [{ title: 'Inception' }];
      mockMoviesService.findAll.mockResolvedValue(list);

      const result = await controller.findAll();

      expect(jest.spyOn(service, 'findAll')).toHaveBeenCalled();
      expect(result).toEqual({
        message: MOVIE_MESSAGES.MOVIES_FOUND,
        data: list,
      });
    });
  });
});
