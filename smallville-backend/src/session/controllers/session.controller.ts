import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { SessionsService } from '../services/session.service';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { SESSION_MESSAGES } from '../messages/sessions.messages';
import { UpdateSessionDto } from '../dtos/update-session.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { Roles } from 'src/common/decorator/roles.decorator';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista todas as sessões disponíveis',
    description:
      'Cada sessão vem acompanhada de `pricing` (inteira e meia já resolvidas pela configuração do ' +
      'administrador) e de `sales` (se está à venda e, quando não está, o porquê). São os mesmos valores ' +
      'usados ao criar o pedido, então a tela mostra o preço que será cobrado.',
  })
  @ApiResponse({ status: 200, description: SESSION_MESSAGES.SESSIONS_FOUND })
  async findAll() {
    const sessions = await this.sessionsService.findAll();

    return {
      message: SESSION_MESSAGES.SESSIONS_FOUND,
      data: await this.sessionsService.describeManyForDisplay(sessions),
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Busca detalhes de uma sessão por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID da sessão a ser buscada',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 200, description: SESSION_MESSAGES.SESSION_FOUND })
  @ApiResponse({
    status: 400,
    description: SESSION_MESSAGES.SESSION_ID_INVALID,
  })
  @ApiResponse({ status: 404, description: SESSION_MESSAGES.SESSION_NOT_FOUND })
  async findOne(@Param('id') id: string) {
    const session = await this.sessionsService.findOne(id);

    return {
      message: SESSION_MESSAGES.SESSION_FOUND,
      data: await this.sessionsService.describeForDisplay(session),
    };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova sessão de filme' })
  @ApiResponse({ status: 201, description: SESSION_MESSAGES.SESSION_CREATED })
  @ApiResponse({
    status: 400,
    description: SESSION_MESSAGES.SESSION_INVALID_REQUEST,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: SESSION_MESSAGES.SESSION_NOT_FOUND })
  async create(@Body() createSessionDto: CreateSessionDto) {
    const session = await this.sessionsService.create(createSessionDto);
    return { message: SESSION_MESSAGES.SESSION_CREATED, data: session };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza uma sessão por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID da sessão a ser atualizada',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 200, description: SESSION_MESSAGES.SESSION_UPDATED })
  @ApiResponse({
    status: 400,
    description: SESSION_MESSAGES.SESSION_ID_INVALID,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: SESSION_MESSAGES.SESSION_NOT_FOUND })
  async update(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    const session = await this.sessionsService.update(id, updateSessionDto);
    return { message: SESSION_MESSAGES.SESSION_UPDATED, data: session };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove uma sessão por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID da sessão a ser deletada',
    type: String,
    example: '64a2b3c4e5f67a8b9c0d1e2f',
  })
  @ApiResponse({ status: 200, description: SESSION_MESSAGES.SESSION_DELETED })
  @ApiResponse({
    status: 400,
    description: SESSION_MESSAGES.SESSION_ID_INVALID,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: SESSION_MESSAGES.SESSION_NOT_FOUND })
  async remove(@Param('id') id: string) {
    await this.sessionsService.remove(id);
    return { message: SESSION_MESSAGES.SESSION_DELETED };
  }

  @Get('movie/:movieTitle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista sessões de um filme específico pelo título' })
  @ApiParam({
    name: 'movieTitle',
    description: 'Título exato ou parte do título do filme',
    type: String,
    example: 'Interestelar',
  })
  @ApiResponse({
    status: 200,
    description: SESSION_MESSAGES.SESSIONS_FOUND,
  })
  async findByMovieTitle(@Param('movieTitle') movieTitle: string) {
    const sessions = await this.sessionsService.findByMovieTitle(movieTitle);

    return {
      message: SESSION_MESSAGES.SESSIONS_FOUND,
      data: await this.sessionsService.describeManyForDisplay(sessions),
    };
  }
}
