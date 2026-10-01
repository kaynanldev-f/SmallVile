import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsQueryDto } from '../dtos/analytics-query.dto';
import { ANALYTICS_MESSAGES } from '../messages/analytics.message';

/** Dashboard de vendas — exclusivo do administrador. */
@ApiTags('Analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Indicadores de vendas do período',
    description:
      'Receita, pedidos, ingressos, produtos e ticket médio, mais a série diária, a distribuição por dia da ' +
      'semana e as formas de pagamento efetivamente usadas. Considera apenas pedidos com pagamento aprovado.',
  })
  @ApiResponse({ status: 200, description: ANALYTICS_MESSAGES.SALES_FOUND })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getSales(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSalesOverview(query);
  }

  @Get('movies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Filmes mais vendidos no período',
    description:
      'Ranking por ingressos vendidos, com receita de bilheteria, número de sessões e taxa de ocupação real ' +
      '(ingressos vendidos sobre a capacidade das sessões).',
  })
  @ApiResponse({ status: 200, description: ANALYTICS_MESSAGES.RANKING_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getMovies(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTopMovies(query);
  }

  @Get('cinemas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cinemas com maior venda no período',
    description:
      'Receita, pedidos e ingressos por cinema. Com um único cinema cadastrado a lista tem um item — a ' +
      'estrutura já suporta a rede inteira sem número inventado.',
  })
  @ApiResponse({ status: 200, description: ANALYTICS_MESSAGES.RANKING_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getCinemas(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTopCinemas(query);
  }

  @Get('products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Produtos da bomboniere mais vendidos no período',
    description: 'Quantidade vendida e receita por produto.',
  })
  @ApiResponse({ status: 200, description: ANALYTICS_MESSAGES.RANKING_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getProducts(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTopProducts(query);
  }

  @Get('stock-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Produtos sem estoque ou com estoque baixo',
    description:
      'Mesma régua da notificação enviada ao administrador durante a venda, para que painel e sino não se ' +
      'contradigam.',
  })
  @ApiResponse({
    status: 200,
    description: ANALYTICS_MESSAGES.STOCK_ALERTS_FOUND,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getStockAlerts() {
    return this.analyticsService.getStockAlerts();
  }
}
