import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/orders/schemas/order.schema';
import { Payment, PaymentSchema } from 'src/payments/schemas/payment.schema';
import { Product, ProductSchema } from 'src/products/schema/products.schema';
import { Session, SessionSchema } from 'src/session/schemas/session.schema';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';

/**
 * Só leitura: o módulo registra os modelos que agrega e não depende de
 * nenhum service de domínio, então não entra em ciclo com pedidos ou
 * pagamentos.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
