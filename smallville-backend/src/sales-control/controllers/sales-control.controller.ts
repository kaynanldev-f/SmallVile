import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { SalesControlService } from '../services/sales-control.service';
import { TicketPricingService } from '../services/ticket-pricing.service';
import { CreatePriceRuleDto } from '../dtos/create-price-rule.dto';
import { UpdatePriceRuleDto } from '../dtos/update-price-rule.dto';
import { UpdateSessionSalesDto } from '../dtos/update-session-sales.dto';
import { SALES_CONTROL_MESSAGES } from '../messages/sales-control.message';
import { WEEKDAY_LABEL } from '../constants/weekday';

/** Painel "Controle de Vendas". */
@ApiTags('Sales Control')
@Controller('sales-control')
export class SalesControlController {
  constructor(
    private readonly salesControlService: SalesControlService,
    private readonly pricingService: TicketPricingService,
  ) {}

  @Get('price-rules')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista a tabela de preços de ingresso (admin)',
    description:
      'Regras cadastradas pelo administrador, da mais geral (todos os dias e cinemas) às específicas ' +
      'por dia da semana e cinema.',
  })
  @ApiResponse({ status: 200, description: SALES_CONTROL_MESSAGES.RULES_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async listRules() {
    const data = await this.salesControlService.listRules();

    return {
      message: SALES_CONTROL_MESSAGES.RULES_FOUND,
      data,
      weekdays: Object.entries(WEEKDAY_LABEL).map(([value, label]) => ({
        value: Number(value),
        label,
      })),
    };
  }

  @Post('price-rules')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria uma regra de preço (admin)',
    description:
      'Define inteira e meia para um dia da semana e/ou cinema. Sem dia e sem cinema, a regra vale como padrão da rede.',
  })
  @ApiResponse({
    status: 201,
    description: SALES_CONTROL_MESSAGES.RULE_CREATED,
  })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 409,
    description: SALES_CONTROL_MESSAGES.RULE_ALREADY_EXISTS,
  })
  async createRule(@Body() dto: CreatePriceRuleDto) {
    const data = await this.salesControlService.createRule(dto);

    return { message: SALES_CONTROL_MESSAGES.RULE_CREATED, data };
  }

  @Patch('price-rules/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza uma regra de preço (admin)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: SALES_CONTROL_MESSAGES.RULE_UPDATED,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 404,
    description: SALES_CONTROL_MESSAGES.RULE_NOT_FOUND,
  })
  async updateRule(@Param('id') id: string, @Body() dto: UpdatePriceRuleDto) {
    const data = await this.salesControlService.updateRule(id, dto);

    return { message: SALES_CONTROL_MESSAGES.RULE_UPDATED, data };
  }

  @Delete('price-rules/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove uma regra de preço (admin)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: SALES_CONTROL_MESSAGES.RULE_DELETED,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 404,
    description: SALES_CONTROL_MESSAGES.RULE_NOT_FOUND,
  })
  async removeRule(@Param('id') id: string) {
    await this.salesControlService.removeRule(id);

    return { message: SALES_CONTROL_MESSAGES.RULE_DELETED };
  }

  @Get('sessions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sessões com preço vigente e situação de venda (admin)',
    description:
      'Cada sessão vem com o preço que está realmente valendo — considerando o preço próprio da sessão e a ' +
      'tabela de regras — e com a situação da venda (habilitada, fora do período, encerrada).',
  })
  @ApiQuery({ name: 'cinemaId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: SALES_CONTROL_MESSAGES.SESSIONS_FOUND,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async listSessions(@Query('cinemaId') cinemaId?: string) {
    const data =
      await this.salesControlService.listSessionsForControl(cinemaId);

    return { message: SALES_CONTROL_MESSAGES.SESSIONS_FOUND, data };
  }

  @Patch('sessions/:sessionId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configura a venda de uma sessão (admin)',
    description:
      'Encerra ou reabre a venda, define o período de vendas e o preço próprio da sessão. Enviar `null` em um ' +
      'preço devolve a sessão para a tabela de regras.',
  })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({
    status: 200,
    description: SALES_CONTROL_MESSAGES.SESSION_SALES_UPDATED,
  })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 404,
    description: SALES_CONTROL_MESSAGES.SESSION_NOT_FOUND,
  })
  async updateSessionSales(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionSalesDto,
  ) {
    const data = await this.salesControlService.updateSessionSales(
      sessionId,
      dto,
    );

    return { message: SALES_CONTROL_MESSAGES.SESSION_SALES_UPDATED, data };
  }

  @Get('sessions/:sessionId/pricing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preço vigente e situação de venda de uma sessão',
    description:
      'Rota aberta: é o preço que a tela de seleção de assentos deve exibir, resolvido pelo servidor. ' +
      'O mesmo cálculo é usado ao criar o pedido, então o valor mostrado é o valor cobrado.',
  })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ status: 200, description: 'Preço da sessão retornado.' })
  @ApiResponse({
    status: 404,
    description: SALES_CONTROL_MESSAGES.SESSION_NOT_FOUND,
  })
  async getSessionPricing(@Param('sessionId') sessionId: string) {
    const session = await this.pricingService.findSessionOrFail(sessionId);

    return {
      sessionId,
      pricing: await this.pricingService.resolveForSession(session),
      sales: this.pricingService.describeAvailability(session),
    };
  }
}
