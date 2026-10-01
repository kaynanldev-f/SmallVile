import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, type AuthRequest } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { OrdersService } from '../services/orders.service';
import { QueryRefundsDto } from '../dtos/query-refunds.dto';
import { ApproveRefundDto } from '../dtos/approve-refund.dto';
import { RejectRefundDto } from '../dtos/reject-refund.dto';
import { ORDERS_MESSAGES } from '../messages/orders.message';

/** Análise das solicitações de reembolso — área administrativa. */
@ApiTags('Refunds')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@Controller('refunds')
export class RefundsController {
  constructor(private readonly ordersService: OrdersService) {}

  private getAuditContext(req: AuthRequest) {
    const token = req.headers.authorization?.split(' ')[1] ?? '';

    return {
      userId: req.user.sub,
      sessionId: createHash('sha256').update(token).digest('hex'),
      role: req.user.role,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista as solicitações de reembolso (admin)',
    description:
      'Fila de análise do painel. Sem filtro, retorna solicitações em análise, aprovadas e recusadas, ' +
      'da mais recente para a mais antiga. `pendingCount` traz o total de solicitações aguardando decisão, ' +
      'independente do filtro aplicado.',
  })
  @ApiResponse({
    status: 200,
    description: ORDERS_MESSAGES.REFUND_REQUESTS_FOUND,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: ORDERS_MESSAGES.REFUND_REVIEW_FORBIDDEN,
  })
  async findAll(@Req() req: AuthRequest, @Query() query: QueryRefundsDto) {
    const ctx = this.getAuditContext(req);
    const result = await this.ordersService.listRefundRequests(query, ctx);

    return { message: ORDERS_MESSAGES.REFUND_REQUESTS_FOUND, ...result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detalha uma solicitação de reembolso (admin)',
    description:
      'Retorna o pedido completo — cliente, sessão, assentos, ingressos, produtos e valores — junto com os ' +
      'dados da solicitação e o histórico de auditoria do pedido, que é o que embasa a decisão.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido que possui a solicitação de reembolso',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.ORDER_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: ORDERS_MESSAGES.REFUND_REVIEW_FORBIDDEN,
  })
  @ApiResponse({
    status: 404,
    description: ORDERS_MESSAGES.REFUND_REQUEST_NOT_FOUND,
  })
  async findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.findRefundRequest(id, ctx);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprova a solicitação de reembolso (admin)',
    description:
      'Encerra a análise aprovando a devolução do valor integral do pedido. Libera os assentos, restitui o ' +
      'estoque da bomboniere, invalida os ingressos e estorna os pontos da compra — tudo de forma idempotente, ' +
      'sem repetir o que o cancelamento já tenha devolvido. ' +
      'ATENÇÃO: a aprovação é a decisão do cinema, não um estorno financeiro — o sistema não possui integração ' +
      'com gateway de pagamento, então a devolução do dinheiro é operação externa. ' +
      'Só uma solicitação em análise pode ser aprovada; a segunda tentativa responde 409.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido que possui a solicitação de reembolso',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiBody({ type: ApproveRefundDto, required: false })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.REFUND_APPROVED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: ORDERS_MESSAGES.REFUND_REVIEW_FORBIDDEN,
  })
  @ApiResponse({
    status: 404,
    description: ORDERS_MESSAGES.REFUND_REQUEST_NOT_FOUND,
  })
  @ApiResponse({
    status: 409,
    description: ORDERS_MESSAGES.REFUND_ALREADY_RESOLVED,
  })
  async approve(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto = {},
  ) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.approveRefund(id, dto, ctx);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recusa a solicitação de reembolso (admin)',
    description:
      'Encerra a análise recusando a devolução. A compra continua valendo: o ingresso segue válido e o assento ' +
      'continua ocupado. O motivo é obrigatório e é enviado ao comprador na notificação, além de ficar gravado ' +
      'em `refund.resolutionReason` — separado do motivo que o próprio usuário alegou ao solicitar. ' +
      'Só uma solicitação em análise pode ser recusada; a segunda tentativa responde 409.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido que possui a solicitação de reembolso',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiBody({ type: RejectRefundDto })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.REFUND_REJECTED })
  @ApiResponse({
    status: 400,
    description: ORDERS_MESSAGES.REFUND_REJECTION_REASON_REQUIRED,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: ORDERS_MESSAGES.REFUND_REVIEW_FORBIDDEN,
  })
  @ApiResponse({
    status: 404,
    description: ORDERS_MESSAGES.REFUND_REQUEST_NOT_FOUND,
  })
  @ApiResponse({
    status: 409,
    description: ORDERS_MESSAGES.REFUND_ALREADY_RESOLVED,
  })
  async reject(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
  ) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.rejectRefund(id, dto, ctx);
  }
}
