import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createHash } from 'crypto';
import { AuthGuard, type AuthRequest } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { RejectPaymentDto } from '../dtos/reject-payment.dto';
import { PAYMENT_MESSAGE } from '../messages/payments.message';

@ApiTags('Payments')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private getAuditContext(req: AuthRequest) {
    const token = req.headers.authorization?.split(' ')[1] ?? '';
    return {
      userId: req.user.sub,
      sessionId: createHash('sha256').update(token).digest('hex'),
      role: req.user.role,
    };
  }

  @Get('methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista as formas de pagamento e a disponibilidade de cada uma',
    description:
      'A tela de pagamento monta as opções a partir desta rota. Cartão de crédito e débito seguem listados ' +
      'para indicar que serão implementados, porém com `available: false` e o motivo a ser exibido como "em breve" — ' +
      'nenhuma cobrança pode ser criada por eles.',
  })
  @ApiResponse({ status: 200, description: 'Formas de pagamento retornadas.' })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  listMethods() {
    return this.paymentsService.listPaymentMethods();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria um pagamento para um pedido',
    description:
      'Endpoint para iniciar o pagamento de um pedido. Revalida a disponibilidade dos assentos e envia a cobrança ao gateway. ' +
      'Para PIX, retorna o QR Code e o código copia e cola, permanecendo PENDING até a confirmação ou expiração do prazo. ' +
      'Cartão de crédito/débito ainda não é processado: a requisição é recusada com 400 até a integração com um gateway real.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Pagamento criado e enviado ao gateway.',
  })
  @ApiResponse({
    status: 400,
    description: PAYMENT_MESSAGE.PAYMENT_METHOD_UNAVAILABLE,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: PAYMENT_MESSAGE.ORDER_NOT_FOUND })
  @ApiResponse({
    status: 409,
    description: PAYMENT_MESSAGE.PAYMENT_ALREADY_PROCESSED,
  })
  @ApiResponse({
    status: 503,
    description: PAYMENT_MESSAGE.GATEWAY_COMMUNICATION_FAILURE,
  })
  async create(@Req() req: AuthRequest, @Body() dto: CreatePaymentDto) {
    const ctx = this.getAuditContext(req);
    return this.paymentsService.createPayment(ctx.userId, dto, ctx);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consulta o status do pagamento',
    description:
      'Endpoint para consultar o status atual de um pagamento do usuário logado (PENDING, APPROVED, REFUSED ou EXPIRED). ' +
      'Pagamentos PIX cujo prazo já venceu são marcados como expirados nesta consulta.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pagamento a ser consultado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: 'Status do pagamento retornado.' })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado.' })
  async getStatus(@Req() req: AuthRequest, @Param('id') id: string) {
    const ctx = this.getAuditContext(req);
    return this.paymentsService.getStatus(id, ctx.userId);
  }

  @Post(':id/mock-confirm-pix')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma um pagamento PIX (simulação)',
    description:
      'Endpoint de simulação/desenvolvimento que representa o webhook enviado por um gateway real ao confirmar o pagamento PIX. ' +
      'Aprova o pagamento e marca o pedido como pago.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pagamento PIX a ser confirmado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: 'Pagamento PIX confirmado.' })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado.' })
  @ApiResponse({
    status: 409,
    description: PAYMENT_MESSAGE.PAYMENT_ALREADY_PROCESSED,
  })
  async mockConfirmPix(@Req() req: AuthRequest, @Param('id') id: string) {
    const ctx = this.getAuditContext(req);
    return this.paymentsService.confirmPixPaymentMock(id, ctx.userId, ctx);
  }

  @Post('orders/:orderId/mock-approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprova o pagamento pendente de um pedido (simulação, admin)',
    description:
      'Endpoint de simulação/desenvolvimento: representa a aprovação que, em produção, viria do gateway. ' +
      'Enquanto o gateway é mockado, um PIX permanece pendente indefinidamente porque ninguém escaneia o QR Code — ' +
      'esta rota permite ao administrador concluir o fluxo pelo painel. Aprova o pagamento, finaliza o pedido e emite os ingressos.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID do pedido cujo pagamento pendente será aprovado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: 'Pagamento aprovado.' })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 404,
    description: PAYMENT_MESSAGE.NO_PENDING_PAYMENT,
  })
  @ApiResponse({ status: 409, description: PAYMENT_MESSAGE.PIX_EXPIRED })
  async mockApproveOrderPayment(
    @Req() req: AuthRequest,
    @Param('orderId') orderId: string,
  ) {
    const ctx = this.getAuditContext(req);
    const payment = await this.paymentsService.approveOrderPaymentMock(
      orderId,
      ctx,
    );

    return { message: PAYMENT_MESSAGE.PAYMENT_APPROVED_MOCK, data: payment };
  }

  @Post('orders/:orderId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recusa o pagamento pendente de um pedido (admin)',
    description:
      'Contrapartida da aprovação: o administrador que não identificou o pagamento recusa a cobrança em vez de ' +
      'deixá-la pendente. Apenas um pagamento PENDENTE pode ser recusado (PENDING → RECUSADO); aprovado e recusado ' +
      'são definitivos. O pedido volta para "pagamento recusado", nenhum ingresso é emitido e o usuário pode tentar pagar novamente. ' +
      'O motivo informado é gravado em `failureReason` e exibido ao usuário nos detalhes do pedido.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID do pedido cujo pagamento pendente será recusado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiBody({ type: RejectPaymentDto, required: false })
  @ApiResponse({ status: 200, description: 'Pagamento recusado.' })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 404,
    description: PAYMENT_MESSAGE.NO_PENDING_PAYMENT,
  })
  @ApiResponse({
    status: 409,
    description: PAYMENT_MESSAGE.PAYMENT_ALREADY_PROCESSED,
  })
  async rejectOrderPayment(
    @Req() req: AuthRequest,
    @Param('orderId') orderId: string,
    @Body() dto: RejectPaymentDto = {},
  ) {
    const ctx = this.getAuditContext(req);
    const payment = await this.paymentsService.rejectOrderPayment(
      orderId,
      dto,
      ctx,
    );

    return {
      message: PAYMENT_MESSAGE.PAYMENT_REJECTED_BY_ADMIN,
      data: payment,
    };
  }

  @Get('orders/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consulta o pagamento mais recente de um pedido',
    description:
      'Usado nos detalhes do pedido para mostrar a situação do pagamento — inclusive a recusa e o motivo ' +
      '(`failureReason`). O usuário comum consulta apenas os próprios pedidos; o administrador, qualquer um.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID do pedido cujo pagamento será consultado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: 'Pagamento do pedido retornado.' })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 404,
    description: PAYMENT_MESSAGE.PAYMENT_NOT_FOUND,
  })
  async getOrderPayment(
    @Req() req: AuthRequest,
    @Param('orderId') orderId: string,
  ) {
    const ctx = this.getAuditContext(req);
    return this.paymentsService.findLatestForOrder(
      orderId,
      ctx.userId,
      ctx.role,
    );
  }

  @Post('orders/:orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancela a compra em andamento',
    description:
      'Endpoint do botão "Cancelar Compra": cancela a reserva temporária do pedido e expira os pagamentos pendentes vinculados a ele. ' +
      'Todos os dados informados na tela de pagamento são perdidos.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID do pedido cuja compra será cancelada',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({
    status: 200,
    description: PAYMENT_MESSAGE.PURCHASE_CANCELLED,
  })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: PAYMENT_MESSAGE.ORDER_NOT_FOUND })
  async cancelPurchase(
    @Req() req: AuthRequest,
    @Param('orderId') orderId: string,
  ) {
    const ctx = this.getAuditContext(req);
    return this.paymentsService.cancelPurchase(orderId, ctx.userId, ctx);
  }
}
