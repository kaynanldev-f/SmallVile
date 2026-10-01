import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { LoyaltyService } from '../services/loyalty.service';
import { LOYALTY_MESSAGES } from '../messages/loyalty.message';

@ApiTags('Loyalty')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Saldo de pontos, regra de pontuação e catálogo de recompensas',
    description:
      'Monta a tela "Meus pontos": saldo real acumulado nas compras aprovadas, a regra vigente ' +
      '(10 pontos a cada R$ 5,00) e as recompensas. Todas as recompensas voltam com `available: false` ' +
      'e o motivo a ser exibido como "em breve" — o resgate ainda não existe e nenhum ponto é debitado.',
  })
  @ApiResponse({ status: 200, description: LOYALTY_MESSAGES.BALANCE_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  async getMyPoints(@Req() req: AuthRequest) {
    const balance = await this.loyaltyService.getBalance(req.user.sub);

    return {
      ...balance,
      rule: this.loyaltyService.getEarningRule(),
      redemptionAvailable: false,
      rewards: this.loyaltyService.getRewards(),
    };
  }

  @Get('me/transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extrato de pontos do usuário logado',
    description:
      'Histórico de movimentações — hoje só créditos de compras aprovadas. Cada linha guarda o pedido de ' +
      'origem, o valor da compra e o saldo resultante, o que permite auditar de onde veio cada ponto.',
  })
  @ApiResponse({
    status: 200,
    description: LOYALTY_MESSAGES.TRANSACTIONS_FOUND,
  })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  async getMyTransactions(
    @Req() req: AuthRequest,
    @Query() query: PaginationQueryDto,
  ) {
    return this.loyaltyService.getTransactions(req.user.sub, query);
  }

  @Get('users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Saldo de pontos de um usuário (admin)',
    description:
      'Consulta administrativa do programa de fidelidade. O usuário comum nunca acessa os pontos de outro: ' +
      'a rota é exclusiva do administrador e a validação é do servidor.',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200, description: LOYALTY_MESSAGES.BALANCE_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getUserPoints(@Param('userId') userId: string) {
    const balance = await this.loyaltyService.getBalance(userId);

    return { userId, ...balance, rule: this.loyaltyService.getEarningRule() };
  }
}
