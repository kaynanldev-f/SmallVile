import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  UseInterceptors,
  HttpException,
  UploadedFiles,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { MoviesService } from '../services/movies.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { MOVIE_MESSAGES } from '../messages/movies.message';
import { CreateMovieDto } from '../dtos/create-movie.dto';
import { UpdateMovieDto } from '../dtos/update-movie.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { StorageService } from 'src/storage/storage.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateMovieWithAssetsDto } from '../dtos/create-movie-with-assets';
import { imageMulterOptions } from 'src/storage/multer-image.config';
import { UpdateMovieWithAssetsDto } from '../dtos/update-movie-with-assets';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'banner', maxCount: 1 },
        { name: 'actorsPhotos', maxCount: 20 },
      ],
      imageMulterOptions,
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateMovieWithAssetsDto })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar filme com banner e fotos do elenco em uma única requisição',
  })
  @ApiResponse({ status: 201, description: MOVIE_MESSAGES.MOVIE_CREATED })
  @ApiResponse({ status: 400, description: MOVIE_MESSAGES.INVALID_MOVIE_DATA })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 413,
    description: MOVIE_MESSAGES.MOVIE_PAYLOAD_TOO_LARGE,
  })
  async create(
    @Body() dto: CreateMovieDto,
    @UploadedFiles()
    files: {
      banner?: Express.Multer.File[];
      actorsPhotos?: Express.Multer.File[];
    },
  ) {
    if (!files?.banner || files.banner.length === 0) {
      throw new HttpException(
        { message: 'O banner do filme é obrigatório.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const uploadedBanner = await this.storageService.uploadFile(
      files.banner[0],
    );
    dto.banner = uploadedBanner.url;

    const actorsPhotos = files?.actorsPhotos || [];

    if (dto.cast && dto.cast.length > 0) {
      if (dto.cast.length !== actorsPhotos.length) {
        throw new HttpException(
          {
            message: `A quantidade de fotos (${actorsPhotos.length}) deve ser igual à quantidade de atores no elenco (${dto.cast.length}).`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const uploadPromises = actorsPhotos.map((photo) =>
        this.storageService.uploadFile(photo),
      );
      const uploadedPhotos = await Promise.all(uploadPromises);

      dto.cast = dto.cast.map((actor, index) => ({
        ...actor,
        imageUrl: uploadedPhotos[index].url,
      }));
    }

    const movie = await this.moviesService.create(dto);

    return {
      message: MOVIE_MESSAGES.MOVIE_CREATED,
      data: movie,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar filmes (permite filtrar por título)' })
  @ApiQuery({
    name: 'title',
    required: false,
    description: 'Filtra os filmes buscando por parte do título',
    type: String,
  })
  @ApiResponse({ status: 200, description: MOVIE_MESSAGES.MOVIES_FOUND })
  async findAll(@Query('title') title?: string) {
    const movies = await this.moviesService.findAll(title);

    return {
      message: MOVIE_MESSAGES.MOVIES_FOUND,
      data: movies,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar filme por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do filme a ser buscado',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 200, description: MOVIE_MESSAGES.MOVIE_FOUND })
  @ApiResponse({
    status: 400,
    description: MOVIE_MESSAGES.MOVIE_ID_INVALID,
  })
  @ApiResponse({ status: 404, description: MOVIE_MESSAGES.MOVIE_NOT_FOUND })
  async findOne(@Param('id') id: string) {
    const movie = await this.moviesService.findOne(id);

    return {
      message: MOVIE_MESSAGES.MOVIE_FOUND,
      data: movie,
    };
  }

  @Get(':id/details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detalhes do filme + sessões (permite filtrar por cidade)',
    description:
      'Devolve o filme, as sessões em cartaz e os cinemas dessas sessões. ' +
      '`cities` lista as cidades que têm sessão deste filme e `dates` os dias ' +
      'com sessão na cidade escolhida — são as duas listas que abastecem os ' +
      'seletores da tela. Informando `city` e/ou `date`, só as sessões ' +
      'compatíveis voltam; `selectedCity` e `selectedDate` confirmam o que ' +
      'foi aplicado. Os dois filtros são independentes e combináveis.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do filme a ser exibido',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description:
      'Filtra as sessões pelos cinemas da cidade informada. A comparação ' +
      'ignora caixa e acentuação.',
    type: String,
    example: 'São Paulo',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description:
      'Filtra as sessões pelo dia, no formato DD/MM/AAAA — o mesmo dia usado ' +
      'em `dates`.',
    type: String,
    example: '20/08/2026',
  })
  @ApiResponse({ status: 200, description: MOVIE_MESSAGES.MOVIE_FOUND })
  @ApiResponse({
    status: 400,
    description: MOVIE_MESSAGES.MOVIE_ID_INVALID,
  })
  @ApiResponse({ status: 404, description: MOVIE_MESSAGES.MOVIE_NOT_FOUND })
  async details(
    @Param('id') id: string,
    @Query('city') city?: string,
    @Query('date') date?: string,
  ) {
    const movie = await this.moviesService.details(id, city, date);

    return {
      message: MOVIE_MESSAGES.MOVIE_FOUND,
      data: movie,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'banner', maxCount: 1 },
        { name: 'actorsPhotos', maxCount: 20 },
      ],
      imageMulterOptions,
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateMovieWithAssetsDto })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar filme por ID com banner e fotos do elenco',
  })
  @ApiResponse({ status: 200, description: MOVIE_MESSAGES.MOVIE_UPDATED })
  @ApiResponse({
    status: 400,
    description: MOVIE_MESSAGES.INVALID_MOVIE_DATA,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: MOVIE_MESSAGES.MOVIE_NOT_FOUND })
  @ApiResponse({
    status: 413,
    description: MOVIE_MESSAGES.MOVIE_PAYLOAD_TOO_LARGE,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMovieDto,
    @UploadedFiles()
    files: {
      banner?: Express.Multer.File[];
      actorsPhotos?: Express.Multer.File[];
    },
  ) {
    if (files?.banner?.length) {
      const uploadedBanner = await this.storageService.uploadFile(
        files.banner[0],
      );

      dto.banner = uploadedBanner.url;
    }

    const actorsPhotos = files?.actorsPhotos || [];

    if (dto.cast?.length) {
      if (dto.cast.length !== actorsPhotos.length) {
        throw new HttpException(
          {
            message: `A quantidade de fotos (${actorsPhotos.length}) deve ser igual à quantidade de atores no elenco (${dto.cast.length}).`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const uploadedPhotos = await Promise.all(
        actorsPhotos.map((photo) => this.storageService.uploadFile(photo)),
      );

      dto.cast = dto.cast.map((actor, index) => ({
        ...actor,
        imageUrl: uploadedPhotos[index].url,
      }));
    }

    const movie = await this.moviesService.update(id, dto);

    return {
      message: MOVIE_MESSAGES.MOVIE_UPDATED,
      data: movie,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove um filme por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do filme a ser deletado',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 204, description: MOVIE_MESSAGES.MOVIE_DELETED })
  @ApiResponse({
    status: 400,
    description: MOVIE_MESSAGES.MOVIE_ID_INVALID,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: MOVIE_MESSAGES.MOVIE_NOT_FOUND })
  async remove(@Param('id') id: string) {
    await this.moviesService.remove(id);

    return {
      message: MOVIE_MESSAGES.MOVIE_DELETED,
    };
  }
}
