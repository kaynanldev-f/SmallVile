import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { Ticket, TicketDocument } from '../schema/ticket.schema';
import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import { QueryTicketsDto } from '../dtos/query-tickets.dto';
import { TicketCodeService } from './ticket-code.service';
import { UserRole } from 'src/users/enums/user-roles.enum';

// A tela "Meus ingressos" precisa de filme, sessão, cinema e pedido em uma
// única requisição.
const TICKET_DETAIL_POPULATE = [
  { path: 'userId', select: 'name surname email' },
  {
    path: 'sessionId',
    select: '-seats',
    populate: [
      { path: 'cinemaId', select: 'name city state' },
      { path: 'movieId', select: 'title classification banner duration' },
    ],
  },
  { path: 'orderId', select: 'status totalAmount createdAt ticketPdfUrl' },
];
import { Session, SessionDocument } from 'src/session/schemas/session.schema';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { TICKETS_MESSAGES } from '../messages/tickets.message';
import { User, UserDocument } from 'src/users/schemas/users.schema';
import { Movie, MovieDocument } from 'src/movies/schemas/movie.schema';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { Classification } from 'src/movies/enums/classification.enum';
import { calculateAge } from 'src/common/utils/age-validation';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    private readonly ticketCodeService: TicketCodeService,
  ) {}

  async create(
    createTicketDto: CreateTicketDto,
    userId: string,
  ): Promise<TicketDocument> {
    const [user, session] = await Promise.all([
      this.userModel.findById(userId).exec(),
      this.sessionModel.findById(createTicketDto.sessionId).exec(),
    ]);

    if (!user)
      throw new HttpException(
        { message: USER_MESSAGES.USER_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    if (!session)
      throw new HttpException(
        { message: TICKETS_MESSAGES.SESSION_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );

    await this.validateUserAgeForMovie(user, session.movieId);

    const seatIndex = this.validateAndGetSeatIndex(
      session,
      createTicketDto.seatNumber,
    );

    const finalPrice =
      createTicketDto.type === TicketType.HALF
        ? session.price / 2
        : session.price;

    session.seats[seatIndex].isOccupied = true;
    await session.save();

    // Mesmo emitido manualmente pelo administrador, o ingresso nasce com
    // número e QR Code próprios — é o que a portaria valida.
    const ticketNumber = this.ticketCodeService.generateTicketNumber();

    return new this.ticketModel({
      userId: new mongoose.Types.ObjectId(userId),
      sessionId: new mongoose.Types.ObjectId(createTicketDto.sessionId),
      ticketNumber,
      qrCode: this.ticketCodeService.buildQrPayload(ticketNumber),
      status: TicketStatus.VALID,
      seatNumber: createTicketDto.seatNumber,
      type: createTicketDto.type,
      pricePaid: finalPrice,
    }).save();
  }

  /**
   * Listagem com a regra de visibilidade aplicada no servidor: o
   * administrador vê todos os ingressos do sistema, o usuário comum apenas
   * os próprios.
   */
  async findAllForRequester(
    query: QueryTicketsDto,
    requester: { userId: string; role?: UserRole },
  ) {
    const filter: Record<string, unknown> = {};

    if (requester.role !== UserRole.ADMIN) {
      filter.userId = new mongoose.Types.ObjectId(requester.userId);
    } else if (query.userId) {
      filter.userId = new mongoose.Types.ObjectId(query.userId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.sessionId) {
      filter.sessionId = new mongoose.Types.ObjectId(query.sessionId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .populate(TICKET_DETAIL_POPULATE)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.ticketModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Busca um ingresso aplicando a regra de acesso: inexistente responde 404,
   * ingresso de outro usuário responde 403.
   */
  async findOneForRequester(
    ticketId: string,
    requester: { userId: string; role?: UserRole },
  ): Promise<TicketDocument> {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      throw new NotFoundException(TICKETS_MESSAGES.TICKET_NOT_FOUND);
    }

    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate(TICKET_DETAIL_POPULATE)
      .exec();

    if (!ticket) {
      throw new NotFoundException(TICKETS_MESSAGES.TICKET_NOT_FOUND);
    }

    if (
      requester.role !== UserRole.ADMIN &&
      this.extractOwnerId(ticket) !== requester.userId
    ) {
      throw new ForbiddenException(TICKETS_MESSAGES.TICKET_FORBIDDEN);
    }

    return ticket;
  }

  async findAll(): Promise<TicketDocument[]> {
    return this.ticketModel.find().populate(TICKET_DETAIL_POPULATE).exec();
  }

  async findAllGroupedBySession(): Promise<Record<string, TicketDocument[]>> {
    const tickets = await this.ticketModel
      .find()
      .populate(TICKET_DETAIL_POPULATE)
      .exec();

    return tickets.reduce(
      (grouped, ticket) => {
        const sessionId = ticket.sessionId._id
          ? ticket.sessionId._id.toString()
          : ticket.sessionId.toString();

        if (!grouped[sessionId]) {
          grouped[sessionId] = [];
        }

        grouped[sessionId].push(ticket);

        return grouped;
      },
      {} as Record<string, TicketDocument[]>,
    );
  }

  async findByUser(userId: string): Promise<TicketDocument[]> {
    return this.ticketModel
      .find({ userId: new mongoose.Types.ObjectId(userId) })
      .populate(TICKET_DETAIL_POPULATE)
      .sort({ createdAt: -1 })
      .exec();
  }

  // metodos auxiliares

  // `userId` pode chegar populado; a comparação é sempre pelo id.
  private extractOwnerId(ticket: TicketDocument): string {
    const owner: unknown = ticket.userId;

    if (owner instanceof mongoose.Types.ObjectId) {
      return owner.toString();
    }

    return (owner as { _id: mongoose.Types.ObjectId })._id.toString();
  }

  private async validateUserAgeForMovie(
    user: UserDocument,
    movieId: string,
  ): Promise<void> {
    const movie = await this.movieModel.findById(movieId).exec();
    if (!movie) {
      throw new HttpException(
        { message: TICKETS_MESSAGES.MOVIE_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    const age = calculateAge(user.birthDate);
    const movieAgeRequirement =
      movie.classification === Classification.LIVRE
        ? 0
        : Number(movie.classification);

    if (age < movieAgeRequirement) {
      throw new HttpException(
        { message: TICKETS_MESSAGES.USER_NOT_ELIGIBLE },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private validateAndGetSeatIndex(
    session: SessionDocument,
    seatNumber: string,
  ): number {
    const seatIndex = session.seats.findIndex(
      (s) => s.seatNumber === seatNumber,
    );

    if (seatIndex === -1) {
      throw new HttpException(
        { message: TICKETS_MESSAGES.SEAT_NOT_FOUND(seatNumber) },
        HttpStatus.NOT_FOUND,
      );
    }

    if (session.seats[seatIndex].isOccupied) {
      throw new HttpException(
        { message: TICKETS_MESSAGES.SEAT_ALREADY_OCCUPIED(seatNumber) },
        HttpStatus.BAD_REQUEST,
      );
    }

    return seatIndex;
  }
}
