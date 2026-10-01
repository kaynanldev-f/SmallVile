import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsService } from './service/tickets.service';
import { TicketPdfService } from './service/ticket-pdf.service';
import { TicketCodeService } from './service/ticket-code.service';
import { TicketsController } from './controllers/tickets.controller';
import { Ticket, TicketSchema } from './schema/ticket.schema';
import { Session, SessionSchema } from 'src/session/schemas/session.schema';
import { User, UserSchema } from 'src/users/schemas/users.schema';
import { Movie, MovieSchema } from 'src/movies/schemas/movie.schema';
import { Order, OrderSchema } from 'src/orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
      { name: Movie.name, schema: MovieSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketPdfService, TicketCodeService],
  // A emissão do ingresso (número, QR Code e PDF) é usada pelo módulo de
  // pedidos na finalização da compra.
  exports: [TicketsService, TicketPdfService, TicketCodeService],
})
export class TicketsModule {}
