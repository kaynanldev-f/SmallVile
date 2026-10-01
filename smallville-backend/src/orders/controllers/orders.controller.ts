import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthGuard, type AuthRequest } from 'src/auth/guards/auth.guard';
import { OrdersService } from '../services/orders.service';
import { QueryOrdersDto } from '../dtos/query-orders.dto';
import { RequestCancellationDto } from '../dtos/request-cancellation.dto';
import { RequestRefundDto } from '../dtos/request-refund.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { ORDERS_MESSAGES } from '../messages/orders.message';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { UpdateOrderProductsDto } from '../dtos/update-order-products.dto';

@ApiTags('Orders')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private getAuditContext(req: AuthRequest) {
    const token = req.headers.authorization?.split(' ')[1] ?? '';
    const sessionId = createHash('sha256').update(token).digest('hex');

    return {
      userId: req.user.sub,
      sessionId,
      role: req.user.role,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista os pedidos visíveis para o usuário autenticado',
    description:
      'Usuário comum recebe apenas os próprios pedidos; administrador recebe todos os pedidos do sistema. ' +
      'A regra é aplicada no servidor a partir do papel presente no token.',
  })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.ORDERS_FOUND })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  async findAll(@Req() req: AuthRequest, @Query() query: QueryOrdersDto) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.findAll(query, ctx);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Busca pedido por ID',
    description:
      'Retorna o pedido com usuário, sessão, filme, assentos, ingressos e produtos da bomboniere. ' +
      'O usuário comum só acessa os próprios pedidos; o administrador acessa qualquer pedido.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido a ser buscado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.ORDER_FOUND })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: ORDERS_MESSAGES.ORDER_FORBIDDEN })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  async findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.findOneForRequester(id, ctx);
  }

  @Get(':id/ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Busca os dados do ingresso do pedido',
    description:
      'Retorna os dados reais do ingresso gerado na compra: filme, sessão, sala, assentos, ' +
      'número do ingresso, conteúdo do QR Code, cliente, bomboniere e valores.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.ORDERS_FOUND })
  @ApiResponse({
    status: 400,
    description: ORDERS_MESSAGES.TICKET_NOT_AVAILABLE,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: ORDERS_MESSAGES.ORDER_FORBIDDEN })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  async viewTicket(@Req() req: AuthRequest, @Param('id') id: string) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.viewTicket(id, ctx);
  }

  @Get(':id/ticket/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download do ingresso em PDF',
    description:
      'Gera e devolve o arquivo PDF do ingresso com os dados reais da compra e o QR Code.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Arquivo PDF do ingresso.' })
  @ApiResponse({
    status: 400,
    description: ORDERS_MESSAGES.TICKET_NOT_AVAILABLE,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: ORDERS_MESSAGES.ORDER_FORBIDDEN })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  async downloadTicket(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const ctx = this.getAuditContext(req);
    const { fileName, pdf } = await this.ordersService.downloadTicket(id, ctx);

    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Post(':id/ticket/resend-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenvia o ingresso por e-mail',
    description:
      'Reenvia o e-mail de confirmação com o PDF do ingresso anexado para o e-mail cadastrado do usuário. ' +
      'Útil quando o envio automático da compra falhou.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({
    status: 200,
    description: ORDERS_MESSAGES.CONFIRMATION_EMAIL_SENT,
  })
  @ApiResponse({
    status: 400,
    description: ORDERS_MESSAGES.TICKET_NOT_AVAILABLE,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: ORDERS_MESSAGES.ORDER_FORBIDDEN })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  @ApiResponse({
    status: 503,
    description: ORDERS_MESSAGES.CONFIRMATION_EMAIL_FAILED,
  })
  async resendTicketEmail(@Req() req: AuthRequest, @Param('id') id: string) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.resendConfirmationEmail(id, ctx);
  }

  @Get(':id/receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Busca recibo do pedido',
    description:
      'Endpoint para buscar o recibo detalhado do pedido finalizado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.ORDERS_FOUND })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  async getReceipt(@Req() req: AuthRequest, @Param('id') id: string) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.getReceipt(id, ctx);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicita cancelamento do pedido',
    description:
      'Endpoint para abrir uma solicitação de cancelamento de um pedido existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido a ser cancelado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiBody({ type: RequestCancellationDto })
  @ApiResponse({
    status: 200,
    description: ORDERS_MESSAGES.CANCELLATION_REQUESTED,
  })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  async requestCancellation(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RequestCancellationDto,
  ) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.requestCancellation(id, ctx.userId, dto, ctx);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicita reembolso do pedido',
    description:
      'Endpoint para abrir um pedido de reembolso/estorno do valor do pedido.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido para solicitação de reembolso',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiBody({ type: RequestRefundDto })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.REFUND_REQUESTED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  async requestRefund(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RequestRefundDto,
  ) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.requestRefund(id, ctx.userId, dto, ctx);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria um novo pedido',
    description:
      'Endpoint para iniciar um pedido (carrinho) reservando os assentos escolhidos.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: ORDERS_MESSAGES.ORDER_CREATED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  async create(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.create(dto, ctx.userId, ctx);
  }

  @Patch(':id/products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualiza produtos do pedido',
    description:
      'Endpoint para adicionar ou remover produtos da bomboniere no carrinho.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido a ser atualizado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiBody({ type: UpdateOrderProductsDto })
  @ApiResponse({ status: 200, description: ORDERS_MESSAGES.ORDER_UPDATED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: ORDERS_MESSAGES.ORDER_NOT_FOUND })
  async updateProducts(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderProductsDto,
  ) {
    const ctx = this.getAuditContext(req);
    return this.ordersService.updateProducts(id, dto, ctx.userId, ctx);
  }

  // A finalização da compra (ocupar assentos, baixar estoque e gerar os
  // ingressos) não tem rota própria: ela é disparada pelo módulo de
  // pagamentos quando o pagamento é aprovado.
}
