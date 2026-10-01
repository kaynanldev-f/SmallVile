import { Module } from '@nestjs/common';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './controllers/payment.controller';
import { MockPaymentGatewayService } from './services/mock-payment-gateway.service';
import { PaymentsService } from './services/payments.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    OrdersModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentGatewayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
