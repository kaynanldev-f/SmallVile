import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from 'src/session/schemas/session.schema';
import {
  TicketPriceRule,
  TicketPriceRuleSchema,
} from './schemas/ticket-price-rule.schema';
import { TicketPricingService } from './services/ticket-pricing.service';
import { SalesControlService } from './services/sales-control.service';
import { SalesControlController } from './controllers/sales-control.controller';

/**
 * Registra o modelo de sessão por conta própria — em vez de importar o
 * SessionsModule — para que sessões e pedidos possam depender do preço sem
 * criar ciclo entre os módulos.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TicketPriceRule.name, schema: TicketPriceRuleSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [SalesControlController],
  providers: [TicketPricingService, SalesControlService],
  exports: [TicketPricingService, SalesControlService],
})
export class SalesControlModule {}
