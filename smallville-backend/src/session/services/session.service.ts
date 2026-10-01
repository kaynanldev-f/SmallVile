import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Session, SessionDocument } from '../schemas/session.schema';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { SeatType } from '../enums/seat-type.enum';
import { SESSION_MESSAGES } from '../messages/sessions.messages';
import { SeatDto } from '../dtos/seats.dto';
import { UpdateSessionDto } from '../dtos/update-session.dto';
import { MoviesService } from 'src/movies/services/movies.service';
import { CinemasService } from 'src/cinemas/services/cinema.service';
import { CINEMA_MESSAGES } from 'src/cinemas/messages/cinema.messages';
import { Order, OrderDocument } from 'src/orders/schemas/order.schema';
import { OrderStatus } from 'src/orders/enums/order-status.enum';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { NOTIFICATION_CONTENT } from 'src/notifications/messages/notification-content';
import { TicketPricingService } from 'src/sales-control/services/ticket-pricing.service';
import { parseCinemaDate } from 'src/sales-control/constants/weekday';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,

    @Inject(forwardRef(() => MoviesService))
    private moviesService: MoviesService,

    @Inject(forwardRef(() => CinemasService))
    private cinemasService: CinemasService,

    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,

    private notificationsService: NotificationsService,

    private pricingService: TicketPricingService,
  ) {}

  /** Quem comprou esta sessão. */
  private async findAffectedBuyers(
    sessionId: string,
  ): Promise<mongoose.Types.ObjectId[]> {
    const buyers = await this.orderModel
      .distinct('user', {
        session: new mongoose.Types.ObjectId(sessionId),
        status: {
          $in: [
            OrderStatus.PAYMENT_PENDING,
            OrderStatus.PAYMENT_APPROVED,
            OrderStatus.ORDER_PLACED,
          ],
        },
      })
      .exec();

    return buyers;
  }

  /** Sessão com o preço vigente e a situação da venda, para as telas. */
  async describeForDisplay(
    session: SessionDocument,
  ): Promise<Record<string, unknown>> {
    return {
      ...(session.toJSON() as Record<string, unknown>),
      pricing: await this.pricingService.resolveForSession(session),
      sales: this.pricingService.describeAvailability(session),
    };
  }

  async describeManyForDisplay(
    sessions: SessionDocument[],
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(
      sessions.map((session) => this.describeForDisplay(session)),
    );
  }

  private readonly ROW_LETTERS = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
  ];
  private readonly SEATS_PER_ROW = 11;

  private generateDefaultSeats(): SeatDto[] {
    const seats: SeatDto[] = [];

    const rowASequence: SeatType[] = [
      SeatType.WHEELCHAIR,
      SeatType.PCD_COMPANION,
      SeatType.WHEELCHAIR,
      SeatType.PCD_COMPANION,
      SeatType.PREFERENTIAL,
      SeatType.PREFERENTIAL,
      SeatType.PREFERENTIAL,
      SeatType.PREFERENTIAL,
      SeatType.OBESE,
      SeatType.OBESE,
      SeatType.COMMON,
    ];

    rowASequence.forEach((type, index) => {
      seats.push({ seatNumber: `A${index + 1}`, type });
    });

    this.ROW_LETTERS.slice(1).forEach((letter) => {
      const seatsInRow = letter === 'L' ? 10 : this.SEATS_PER_ROW;
      for (let i = 1; i <= seatsInRow; i++) {
        seats.push({ seatNumber: `${letter}${i}`, type: SeatType.COMMON });
      }
    });

    return seats;
  }
  private validateRoomCapacity(seats: SeatDto[]) {
    if (seats.length !== 120) {
      throw new HttpException(
        { message: SESSION_MESSAGES.ROOM_CAPACITY_INVALID(seats.length) },
        HttpStatus.BAD_REQUEST,
      );
    }

    const seatNumbers = seats.map((s) => s.seatNumber);
    const hasDuplicates = seatNumbers.some(
      (val, i) => seatNumbers.indexOf(val) !== i,
    );
    if (hasDuplicates) {
      throw new HttpException(
        { message: SESSION_MESSAGES.SEAT_CONFLICT },
        HttpStatus.BAD_REQUEST,
      );
    }

    const counts = {
      [SeatType.COMMON]: 0,
      [SeatType.PREFERENTIAL]: 0,
      [SeatType.WHEELCHAIR]: 0,
      [SeatType.PCD_COMPANION]: 0,
      [SeatType.OBESE]: 0,
    };

    seats.forEach((seat) => {
      if (counts[seat.type] !== undefined) {
        counts[seat.type]++;
      }
    });

    if (counts[SeatType.COMMON] !== 110) {
      throw new HttpException(
        {
          message: SESSION_MESSAGES.SEAT_COUNT_INVALID(
            'poltronas comuns',
            110,
            counts[SeatType.COMMON],
          ),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (counts[SeatType.PREFERENTIAL] !== 4) {
      throw new HttpException(
        {
          message: SESSION_MESSAGES.SEAT_COUNT_INVALID(
            'poltronas preferenciais',
            4,
            counts[SeatType.PREFERENTIAL],
          ),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (counts[SeatType.WHEELCHAIR] !== 2) {
      throw new HttpException(
        {
          message: SESSION_MESSAGES.SEAT_COUNT_INVALID(
            'espaços para cadeirantes',
            2,
            counts[SeatType.WHEELCHAIR],
          ),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (counts[SeatType.PCD_COMPANION] !== 2) {
      throw new HttpException(
        {
          message: SESSION_MESSAGES.SEAT_COUNT_INVALID(
            'assentos para acompanhantes PCD',
            2,
            counts[SeatType.PCD_COMPANION],
          ),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (counts[SeatType.OBESE] !== 2) {
      throw new HttpException(
        {
          message: SESSION_MESSAGES.SEAT_COUNT_INVALID(
            'poltronas para pessoas obesas',
            2,
            counts[SeatType.OBESE],
          ),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Regra de negócio: a sessão não pode acontecer antes da estreia do filme.
   *
   * Os dois lados passam pelo mesmo `parseCinemaDate`, então são lidos no fuso
   * do cinema: a estreia ("DD/MM/AAAA") vira meia-noite daquele dia e a sessão
   * ("DD/MM/AAAA HH:MM") o instante exato. Assim uma sessão no próprio dia da
   * estreia passa em qualquer horário e a véspera é barrada mesmo às 23:59,
   * sem depender do fuso em que o servidor roda.
   */
  private validateAgainstMovieRelease(
    sessionDateTime: Date,
    movie: { releaseDate?: string },
  ): void {
    const rawReleaseDate = movie.releaseDate;

    // Filme sem data de estreia legível não tem o que comparar: a regra não se
    // aplica e o cadastro segue pelas demais validações.
    if (!rawReleaseDate) {
      return;
    }

    const releaseDate = parseCinemaDate(rawReleaseDate);

    if (!releaseDate) {
      return;
    }

    if (sessionDateTime.getTime() < releaseDate.getTime()) {
      throw new HttpException(
        {
          message:
            SESSION_MESSAGES.SESSION_BEFORE_MOVIE_RELEASE(rawReleaseDate),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async create(createSessionDto: CreateSessionDto): Promise<SessionDocument> {
    // Mesmo parser usado pelo controle de vendas: a data gravada é lida no
    // fuso do cinema, e não no fuso do processo.
    const sessionDateTime = parseCinemaDate(createSessionDto.dateTime);

    const now = new Date();

    if (!sessionDateTime) {
      throw new HttpException(
        { message: 'A data e horário fornecidos para a sessão são inválidos.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (sessionDateTime < now) {
      throw new HttpException(
        {
          message:
            'Não é possível criar uma sessão em uma data ou hora retroativa.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(createSessionDto.cinemaId)) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    const cinema = await this.cinemasService.findOne(createSessionDto.cinemaId);

    const movie = await this.moviesService.findByTitle(
      createSessionDto.movieTitle,
    );

    if (!movie) {
      throw new HttpException(
        {
          message:
            'Não é possível criar uma sessão para um filme não cadastrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const movieIsAttachedToCinema = cinema.movies.some(
      (id) => id.toString() === movie._id.toString(),
    );

    if (!movieIsAttachedToCinema) {
      throw new HttpException(
        {
          message: 'Este filme não está em cartaz no cinema selecionado.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!movie.languages.includes(createSessionDto.language)) {
      throw new HttpException(
        { message: 'Este idioma não está disponível para este filme.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    this.validateAgainstMovieRelease(sessionDateTime, movie);

    const sessionData = {
      ...createSessionDto,
      movieId: movie._id.toString(),
      // O título vem do catálogo, não do que foi digitado: a busca é feita
      // sem caixa, então é o filme encontrado que define como o título fica
      // gravado na sessão.
      movieTitle: movie.title ?? createSessionDto.movieTitle,
    };

    if (!sessionData.seats || sessionData.seats.length === 0) {
      sessionData.seats = this.generateDefaultSeats();
    } else {
      this.validateRoomCapacity(sessionData.seats);
    }

    const createdSession = new this.sessionModel(sessionData);
    return createdSession.save();
  }

  async findAll(): Promise<SessionDocument[]> {
    return this.sessionModel.find().exec();
  }

  async findByCinema(cinemaId: string): Promise<SessionDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(cinemaId)) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.sessionModel.find({ cinemaId }).select('-seats').exec();
  }

  async findByMovieTitle(title: string): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({ movieTitle: { $regex: `^${title}$`, $options: 'i' } })
      .exec();
  }

  async findByMovie(movieId: string): Promise<SessionDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.MOVIE_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.sessionModel.find({ movieId: movieId }).exec();
  }

  async findOne(id: string): Promise<SessionDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: SESSION_MESSAGES.SESSION_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    const session = await this.sessionModel.findById(id).exec();

    if (!session) {
      throw new HttpException(
        { message: SESSION_MESSAGES.SESSION_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
    return session;
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<SessionDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: SESSION_MESSAGES.SESSION_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (updateSessionDto.seats) {
      this.validateRoomCapacity(updateSessionDto.seats);
    }

    // Guardado antes da alteração: é a comparação com o horário anterior que
    // diz se houve remarcação — e só remarcação justifica avisar quem já
    // comprou.
    const current = await this.sessionModel
      .findById(id)
      .select('dateTime movieId')
      .lean()
      .exec();

    const previousDateTime = current?.dateTime;

    // Remarcar cai na mesma regra da criação: nenhuma sessão pode ser movida
    // para antes da estreia do filme.
    if (
      updateSessionDto.dateTime &&
      updateSessionDto.dateTime !== previousDateTime &&
      current?.movieId
    ) {
      const newDateTime = parseCinemaDate(updateSessionDto.dateTime);

      if (!newDateTime) {
        throw new HttpException(
          {
            message: 'A data e horário fornecidos para a sessão são inválidos.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const movie = await this.moviesService.findOne(
        current.movieId.toString(),
      );

      this.validateAgainstMovieRelease(newDateTime, movie);
    }

    const session = await this.sessionModel
      .findByIdAndUpdate(id, { $set: updateSessionDto }, { new: true })
      .exec();

    if (!session) {
      throw new HttpException(
        { message: SESSION_MESSAGES.SESSION_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    if (previousDateTime && previousDateTime !== session.dateTime) {
      await this.notifyBuyers(
        id,
        NOTIFICATION_CONTENT.sessionUpdated(
          id,
          session.movieTitle,
          session.dateTime,
        ),
      );
    }

    return session;
  }

  async deleteManyByMovie(movieId: string): Promise<any> {
    return this.sessionModel.deleteMany({ movieId }).exec();
  }

  async remove(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: SESSION_MESSAGES.SESSION_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    // Os compradores são levantados antes da exclusão: depois dela não há
    // mais como saber quem tinha ingresso para esta sessão.
    const buyers = await this.findAffectedBuyers(id);

    const deletedSession = await this.sessionModel
      .findOneAndDelete({ _id: id })
      .exec();

    if (!deletedSession) {
      throw new HttpException(
        { message: SESSION_MESSAGES.SESSION_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    const content = NOTIFICATION_CONTENT.sessionCancelled(
      id,
      deletedSession.movieTitle,
    );

    for (const buyer of buyers) {
      await this.notificationsService.notifyUser(buyer.toString(), content);
    }
  }

  private async notifyBuyers(
    sessionId: string,
    content: Parameters<NotificationsService['notifyUser']>[1],
  ): Promise<void> {
    const buyers = await this.findAffectedBuyers(sessionId);

    for (const buyer of buyers) {
      await this.notificationsService.notifyUser(buyer.toString(), content);
    }
  }
}
