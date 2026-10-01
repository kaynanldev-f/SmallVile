import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import {
  OrderAuditLog,
  OrderAuditLogSchema,
} from './schemas/order-audit-log.schema';
import { Ticket, TicketSchema } from 'src/tickets/schema/ticket.schema';
import { User, UserSchema } from 'src/users/schemas/users.schema';
import { OrdersController } from './controllers/orders.controller';
import { RefundsController } from './controllers/refunds.controller';
import { OrdersService } from './services/orders.service';
import { OrdersAuditService } from './services/orders-audit.service';
import { SessionInfoAdapter } from './services/session-info.adapter';
import { SESSION_INFO_GATEWAY } from './services/session-info.gateway';
import { SessionsModule } from 'src/session/session.module';
import { MoviesModule } from 'src/movies/movies.module';
import { ProductsModule } from 'src/products/products.module';
import { MOVIE_INFO_GATEWAY } from './services/movie-info.gateway';
import { MovieInfoAdapter } from './services/movie-info.adapter';
import { Session, SessionSchema } from 'src/session/schemas/session.schema';
import { TicketsModule } from 'src/tickets/tickets.module';
import { StorageModule } from 'src/storage/storage.module';
import { OrderReceiptService } from './services/order-receipt.service';
import { OrderMailService } from './services/order-mail.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { LoyaltyModule } from 'src/loyalty/loyalty.module';
import { SalesControlModule } from 'src/sales-control/sales-control.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderAuditLog.name, schema: OrderAuditLogSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    forwardRef(() => SessionsModule),
    forwardRef(() => MoviesModule),
    ProductsModule,
    // Emissão do ingresso (número, QR Code e PDF) e publicação do arquivo.
    forwardRef(() => TicketsModule),
    StorageModule,
    // Avisos ao comprador e à operação, pontos da compra aprovada e a
    // tabela de preços que define quanto o assento custa.
    NotificationsModule,
    LoyaltyModule,
    SalesControlModule,
  ],
  controllers: [OrdersController, RefundsController],
  providers: [
    OrdersService,
    OrdersAuditService,
    OrderReceiptService,
    OrderMailService,
    { provide: SESSION_INFO_GATEWAY, useClass: SessionInfoAdapter },
    { provide: MOVIE_INFO_GATEWAY, useClass: MovieInfoAdapter },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
