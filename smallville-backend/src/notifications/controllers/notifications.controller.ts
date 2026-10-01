import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
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
import { NotificationsService } from '../services/notifications.service';
import { QueryNotificationsDto } from '../dtos/query-notifications.dto';
import { NotificationAudience } from '../enums/notification-audience.enum';
import { NOTIFICATION_MESSAGES } from '../messages/notifications.message';

@ApiTags('Notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private requester(req: AuthRequest) {
    return { userId: req.user.sub, role: req.user.role };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista as notificações do solicitante',
    description:
      'Cada um lê a própria caixa: o usuário comum recebe as notificações das compras dele e o administrador, ' +
      'por padrão, as da operação do cinema (`audience=administrador`). Um usuário comum que peça a caixa ' +
      'administrativa recebe 403 — a regra é do servidor, não da ocultação do menu.',
  })
  @ApiResponse({
    status: 200,
    description: NOTIFICATION_MESSAGES.NOTIFICATIONS_FOUND,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: NOTIFICATION_MESSAGES.AUDIENCE_FORBIDDEN,
  })
  async findAll(
    @Req() req: AuthRequest,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findForRequester(
      query,
      this.requester(req),
    );
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quantidade de notificações não lidas',
    description:
      'Alimenta o contador do sino. O número é calculado no banco, com a mesma regra de visibilidade da listagem.',
  })
  @ApiQuery({
    name: 'audience',
    required: false,
    enum: NotificationAudience,
    description:
      'Caixa a ser contada. Sem o parâmetro, a do papel do solicitante.',
  })
  @ApiResponse({ status: 200, description: 'Contador retornado.' })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: NOTIFICATION_MESSAGES.AUDIENCE_FORBIDDEN,
  })
  async unreadCount(
    @Req() req: AuthRequest,
    @Query('audience') audience?: NotificationAudience,
  ) {
    const unreadCount = await this.notificationsService.countUnread(
      this.requester(req),
      audience,
    );

    return { unreadCount };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marca todas as notificações como lidas',
    description: 'Zera o contador do sino da caixa do solicitante.',
  })
  @ApiQuery({
    name: 'audience',
    required: false,
    enum: NotificationAudience,
  })
  @ApiResponse({
    status: 200,
    description: NOTIFICATION_MESSAGES.ALL_NOTIFICATIONS_READ,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  async markAllAsRead(
    @Req() req: AuthRequest,
    @Query('audience') audience?: NotificationAudience,
  ) {
    const updated = await this.notificationsService.markAllAsRead(
      this.requester(req),
      audience,
    );

    return {
      message: NOTIFICATION_MESSAGES.ALL_NOTIFICATIONS_READ,
      updated,
      unreadCount: 0,
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marca uma notificação como lida',
    description:
      'Só o dono marca a própria notificação: a posse faz parte do filtro, então a notificação de outro usuário ' +
      'responde 404 em vez de ser alterada.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da notificação',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({
    status: 200,
    description: NOTIFICATION_MESSAGES.NOTIFICATION_READ,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 404,
    description: NOTIFICATION_MESSAGES.NOTIFICATION_NOT_FOUND,
  })
  async markAsRead(@Req() req: AuthRequest, @Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(
      id,
      this.requester(req),
    );

    if (!notification) {
      throw new NotFoundException(NOTIFICATION_MESSAGES.NOTIFICATION_NOT_FOUND);
    }

    const unreadCount = await this.notificationsService.countUnread(
      this.requester(req),
      notification.audience,
    );

    return {
      message: NOTIFICATION_MESSAGES.NOTIFICATION_READ,
      data: notification,
      unreadCount,
    };
  }
}
