import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsController } from './controllers/session.controller';
import { SessionsService } from './services/session.service';
import { Session, SessionSchema } from './schemas/session.schema';
import { MoviesModule } from 'src/movies/movies.module';
import { CinemasModule } from 'src/cinemas/cinema.module';
import { Order, OrderSchema } from 'src/orders/schemas/order.schema';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { SalesControlModule } from 'src/sales-control/sales-control.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      // Só leitura: descobrir quem comprou a sessão alterada/cancelada para
      // avisar essas pessoas.
      { name: Order.name, schema: OrderSchema },
    ]),
    NotificationsModule,
    SalesControlModule,
    forwardRef(() => MoviesModule),
    forwardRef(() => CinemasModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
