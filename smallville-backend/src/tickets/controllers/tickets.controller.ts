import {
  Controller,
  UseGuards,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Param,
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
import { AuthGuard, type AuthRequest } from 'src/auth/guards/auth.guard';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { TicketsService } from '../service/tickets.service';
import { TICKETS_MESSAGES } from '../messages/tickets.message';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { QueryTicketsDto } from '../dtos/query-tickets.dto';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Compra e emite um novo ingresso para uma sessão manualmente, rota para administradores ',
  })
  @ApiResponse({ status: 201, description: TICKETS_MESSAGES.TICKET_CREATED })
  @ApiResponse({
    status: 400,
    description: 'Assento já ocupado ou ID inválido.',
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 404,
    description: 'Sessão ou assento não encontrado.',
  })
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    const ticket = await this.ticketsService.create(createTicketDto, userId);
    return { message: TICKETS_MESSAGES.TICKET_CREATED, data: ticket };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista os ingressos visíveis para o usuário autenticado',
    description:
      'Usuário comum recebe apenas os próprios ingressos; administrador recebe todos os ingressos do sistema. ' +
      'A regra é aplicada no servidor a partir do papel presente no token. ' +
      'Aceita ?grouped=true (somente administrador) para agrupar por sessão.',
  })
  @ApiQuery({
    name: 'grouped',
    required: false,
    description:
      'Agrupa os ingressos por sessão. Disponível apenas para administradores.',
    example: 'true',
  })
  @ApiResponse({ status: 200, description: TICKETS_MESSAGES.TICKETS_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  async findAllTickets(
    @Req() req: AuthRequest,
    @Query() query: QueryTicketsDto,
    @Query('grouped') grouped?: string,
  ) {
    const requester = { userId: req.user.sub, role: req.user.role };

    // O agrupamento por sessão é uma visão operacional da sala inteira, e
    // por isso continua restrito ao administrador.
    if (grouped === 'true' && requester.role === UserRole.ADMIN) {
      const groupedTickets =
        await this.ticketsService.findAllGroupedBySession();
      return { message: TICKETS_MESSAGES.TICKETS_FOUND, data: groupedTickets };
    }

    const result = await this.ticketsService.findAllForRequester(
      query,
      requester,
    );

    return { message: TICKETS_MESSAGES.TICKETS_FOUND, ...result };
  }

  @Get('my-tickets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista os ingressos do usuário logado',
    description:
      'Atalho para a tela "Meus ingressos": devolve sempre os ingressos do próprio usuário, ' +
      'mesmo quando o requisitante é administrador.',
  })
  @ApiResponse({ status: 200, description: TICKETS_MESSAGES.TICKETS_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  async findMyTickets(@Req() req: AuthRequest) {
    const userId = req.user.sub;
    const tickets = await this.ticketsService.findByUser(userId);
    return { message: TICKETS_MESSAGES.TICKETS_FOUND, data: tickets };
  }

  // Declarada por último de propósito: rotas literais como `my-tickets`
  // precisam ser avaliadas antes do parâmetro `:id`.
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Busca ingresso por ID',
    description:
      'Retorna o ingresso com filme, sessão, cinema, sala, assento, pedido e QR Code. ' +
      'O usuário comum só acessa os próprios ingressos; o administrador acessa qualquer ingresso.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do ingresso',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: TICKETS_MESSAGES.TICKET_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: TICKETS_MESSAGES.TICKET_FORBIDDEN })
  @ApiResponse({ status: 404, description: TICKETS_MESSAGES.TICKET_NOT_FOUND })
  async findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    const ticket = await this.ticketsService.findOneForRequester(id, {
      userId: req.user.sub,
      role: req.user.role,
    });

    return { message: TICKETS_MESSAGES.TICKET_FOUND, data: ticket };
  }
}
