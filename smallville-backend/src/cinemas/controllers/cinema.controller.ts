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
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CreateCinemaDto } from '../dtos/create-cinema.dto';
import { UpdateCinemaDto } from '../dtos/update-cinema.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { CinemasService } from '../services/cinema.service';
import { CINEMA_MESSAGES } from '../messages/cinema.messages';

@ApiTags('Cinemas')
@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar cinema' })
  @ApiResponse({ status: 201, description: CINEMA_MESSAGES.CINEMA_CREATED })
  @ApiResponse({
    status: 400,
    description: CINEMA_MESSAGES.INVALID_CINEMA_DATA,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 409,
    description: CINEMA_MESSAGES.CINEMA_ALREADY_EXISTS,
  })
  async create(@Body() dto: CreateCinemaDto) {
    const cinema = await this.cinemasService.create(dto);

    return {
      message: CINEMA_MESSAGES.CINEMA_CREATED,
      data: cinema,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar cinemas (permite filtrar por nome)' })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filtra os cinemas buscando por parte do nome',
    type: String,
  })
  @ApiResponse({ status: 200, description: CINEMA_MESSAGES.CINEMA_FOUND })
  async findAll(@Query('name') name?: string) {
    const cinemas = await this.cinemasService.findAll(name);

    return {
      message: CINEMA_MESSAGES.CINEMA_FOUND,
      data: cinemas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar cinema por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do cinema a ser buscado',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 200, description: CINEMA_MESSAGES.CINEMA_FOUND })
  @ApiResponse({
    status: 400,
    description: CINEMA_MESSAGES.CINEMA_ID_INVALID,
  })
  @ApiResponse({ status: 404, description: CINEMA_MESSAGES.CINEMA_NOT_FOUND })
  async findOne(@Param('id') id: string) {
    const cinema = await this.cinemasService.findOne(id);

    return {
      message: CINEMA_MESSAGES.CINEMA_FOUND,
      data: cinema,
    };
  }

  @Get(':id/details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detalhes do cinema + filmes + sessões' })
  @ApiParam({
    name: 'id',
    description: 'ID do cinema a ser exibido',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 200, description: CINEMA_MESSAGES.CINEMA_FOUND })
  @ApiResponse({
    status: 400,
    description: CINEMA_MESSAGES.CINEMA_ID_INVALID,
  })
  @ApiResponse({ status: 404, description: CINEMA_MESSAGES.CINEMA_NOT_FOUND })
  async details(@Param('id') id: string) {
    const cinema = await this.cinemasService.details(id);

    return {
      message: CINEMA_MESSAGES.CINEMA_FOUND,
      data: cinema,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar cinema por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do cinema a ser atualizado',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 200, description: CINEMA_MESSAGES.CINEMA_UPDATED })
  @ApiResponse({
    status: 400,
    description: CINEMA_MESSAGES.INVALID_CINEMA_DATA,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: CINEMA_MESSAGES.CINEMA_NOT_FOUND })
  async update(@Param('id') id: string, @Body() dto: UpdateCinemaDto) {
    const cinema = await this.cinemasService.update(id, dto);

    return {
      message: CINEMA_MESSAGES.CINEMA_UPDATED,
      data: cinema,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove um cinema por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do cinema a ser deletado',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 204, description: CINEMA_MESSAGES.CINEMA_DELETED })
  @ApiResponse({
    status: 400,
    description: CINEMA_MESSAGES.CINEMA_ID_INVALID,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: CINEMA_MESSAGES.CINEMA_NOT_FOUND })
  async remove(@Param('id') id: string) {
    await this.cinemasService.remove(id);

    return {
      message: CINEMA_MESSAGES.CINEMA_DELETED,
    };
  }

  @Post(':id/movies/:movieId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anexar um filme a um cinema' })
  @ApiParam({ name: 'id', description: 'ID do cinema' })
  @ApiParam({ name: 'movieId', description: 'ID do filme a ser anexado' })
  @ApiResponse({ status: 200, description: CINEMA_MESSAGES.MOVIE_ATTACHED })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: CINEMA_MESSAGES.CINEMA_NOT_FOUND })
  @ApiResponse({
    status: 409,
    description: CINEMA_MESSAGES.MOVIE_ALREADY_ATTACHED,
  })
  async attachMovie(
    @Param('id') id: string,
    @Param('movieId') movieId: string,
  ) {
    const cinema = await this.cinemasService.attachMovie(id, movieId);

    return {
      message: CINEMA_MESSAGES.MOVIE_ATTACHED,
      data: cinema,
    };
  }

  @Delete(':id/movies/:movieId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover um filme de um cinema' })
  @ApiParam({ name: 'id', description: 'ID do cinema' })
  @ApiParam({ name: 'movieId', description: 'ID do filme a ser removido' })
  @ApiResponse({ status: 200, description: CINEMA_MESSAGES.MOVIE_DETACHED })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 404,
    description: CINEMA_MESSAGES.MOVIE_NOT_ATTACHED,
  })
  async detachMovie(
    @Param('id') id: string,
    @Param('movieId') movieId: string,
  ) {
    const cinema = await this.cinemasService.detachMovie(id, movieId);

    return {
      message: CINEMA_MESSAGES.MOVIE_DETACHED,
      data: cinema,
    };
  }
}
