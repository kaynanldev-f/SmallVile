import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { Movie, MovieDocument } from '../schemas/movie.schema';
import { MOVIE_MESSAGES } from '../messages/movies.message';
import { CreateMovieDto } from '../dtos/create-movie.dto';
import { UpdateMovieDto } from '../dtos/update-movie.dto';
import { SessionsService } from '../../session/services/session.service';
import { CinemasService } from '../../cinemas/services/cinema.service';
import { parseCinemaDate } from '../../sales-control/constants/weekday';
import { cityMatchKey, escapeRegExp } from '../../common/utils/text-validation';

@Injectable()
export class MoviesService {
  constructor(
    @InjectModel(Movie.name)
    private movieModel: Model<MovieDocument>,
    @Inject(forwardRef(() => SessionsService))
    private sessionsService: SessionsService,
    @Inject(forwardRef(() => CinemasService))
    private cinemasService: CinemasService,
  ) {}

  async create(createMovieDto: CreateMovieDto): Promise<MovieDocument> {
    const movieExists = await this.findByTitle(createMovieDto.title);

    if (movieExists) {
      throw new HttpException(
        { message: 'Já existe um filme cadastrado com este título.' },
        HttpStatus.CONFLICT,
      );
    }

    const movie = new this.movieModel({
      ...createMovieDto,
      title: createMovieDto.title.trim(),
    });

    return movie.save();
  }

  /**
   * Busca pelo título exato ignorando a caixa. O título é gravado
   * normalizado pelo DTO, mas o catálogo tem filmes anteriores a essa
   * normalização — comparar sem caixa mantém a sessão desses filmes
   * funcionando e evita cadastrar "Interestelar" e "interestelar" como dois
   * filmes.
   */
  async findByTitle(title: string): Promise<MovieDocument | null> {
    if (typeof title !== 'string' || !title.trim()) {
      return null;
    }

    return this.movieModel
      .findOne({
        title: { $regex: `^${escapeRegExp(title.trim())}$`, $options: 'i' },
      })
      .exec();
  }

  async findAll(title?: string): Promise<MovieDocument[]> {
    const filter = title ? { title: { $regex: title, $options: 'i' } } : {};

    return this.movieModel.find(filter).exec();
  }

  async findOne(id: string): Promise<MovieDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    const movie = await this.movieModel.findById(id).exec();

    if (!movie) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return movie;
  }

  /** Dia da sessão isolado do horário — `dateTime` é "DD/MM/AAAA HH:MM". */
  private sessionDay(dateTime?: string): string {
    return typeof dateTime === 'string' ? dateTime.trim().split(' ')[0] : '';
  }

  /**
   * Detalhes do filme com as sessões em cartaz.
   *
   * `city` e `date` são opcionais e independentes: sem nenhum dos dois a
   * resposta traz todas as sessões, que é o comportamento de sempre. `cities`
   * e `dates` abastecem os dois seletores da tela e continuam vindo mesmo com
   * filtro aplicado — `cities` sempre com todas as cidades em cartaz, e
   * `dates` com os dias da cidade escolhida, para que trocar de cidade
   * atualize os dias oferecidos.
   */
  async details(id: string, city?: string, date?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    const movie = await this.findOne(id);

    if (!movie) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    const sessions = await this.sessionsService.findByMovie(
      movie._id.toString(),
    );

    const cinemaIds = Array.from(
      new Set(
        sessions
          .map((session) => session.cinemaId?.toString())
          .filter((cinemaId): cinemaId is string => Boolean(cinemaId)),
      ),
    );

    const cinemas = await this.cinemasService.findManyByIds(cinemaIds);

    // Só entram no filtro as cidades que de fato têm sessão deste filme —
    // oferecer uma cidade sem sessão levaria a uma tela vazia por construção.
    const cities = Array.from(
      new Set(cinemas.map((cinema) => cinema.city).filter(Boolean)),
    ).sort((first, second) => first.localeCompare(second, 'pt-BR'));

    const requestedKey = cityMatchKey(city);

    // A cidade devolvida é a do cadastro do cinema, não o texto recebido:
    // é ela que o front reexibe no seletor.
    const selectedCity =
      cities.find((available) => cityMatchKey(available) === requestedKey) ??
      null;

    const isFiltering = requestedKey.length > 0;

    const visibleCinemas = isFiltering
      ? cinemas.filter((cinema) => cityMatchKey(cinema.city) === requestedKey)
      : cinemas;

    const visibleCinemaIds = new Set(
      visibleCinemas.map((cinema) => cinema._id.toString()),
    );

    const citySessions = isFiltering
      ? sessions.filter((session) =>
          visibleCinemaIds.has(session.cinemaId?.toString()),
        )
      : sessions;

    // Os dias vêm das sessões da cidade escolhida, e não do filtro de data:
    // é o que mantém a régua de dias correta ao trocar de cidade.
    const dates = Array.from(
      new Set(citySessions.map((session) => this.sessionDay(session.dateTime))),
    )
      .filter(Boolean)
      .sort(
        (first, second) =>
          (parseCinemaDate(first)?.getTime() ?? 0) -
          (parseCinemaDate(second)?.getTime() ?? 0),
      );

    const requestedDate = this.sessionDay(date);

    const selectedDate =
      dates.find((available) => available === requestedDate) ?? null;

    const visibleSessions = requestedDate
      ? citySessions.filter(
          (session) => this.sessionDay(session.dateTime) === requestedDate,
        )
      : citySessions;

    return {
      movie: {
        id: movie._id,
        title: movie.title,
        banner: movie.banner,
        synopsis: movie.synopsis,
        genres: movie.genres,
        classification: movie.classification,
        duration: movie.duration,
        author: movie.author,
        cast: movie.cast,
        trailer: movie.trailer,
        releaseDate: movie.releaseDate,
        languages: movie.languages,
      },
      sessions: visibleSessions,
      /** Cinemas das sessões acima, para a tela não precisar buscar um a um. */
      cinemas: visibleCinemas.map((cinema) => ({
        id: cinema._id,
        name: cinema.name,
        address: cinema.address,
        city: cinema.city,
        state: cinema.state,
        status: cinema.status,
      })),
      /** Todas as cidades com sessão deste filme, mesmo com filtro aplicado. */
      cities,
      /** Dias com sessão na cidade escolhida, em ordem cronológica. */
      dates,
      /** Cidade efetivamente aplicada; `null` quando nenhuma foi pedida. */
      selectedCity,
      /** Dia efetivamente aplicado; `null` quando nenhum foi pedido. */
      selectedDate,
    };
  }

  async update(
    id: string,
    updateMovieDto: UpdateMovieDto,
  ): Promise<MovieDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    const movie = await this.movieModel
      .findByIdAndUpdate(id, updateMovieDto, { new: true })
      .exec();

    if (!movie) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return movie;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    const movie = await this.movieModel.findByIdAndDelete(id).exec();

    if (!movie) {
      throw new HttpException(
        { message: MOVIE_MESSAGES.MOVIE_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.sessionsService.deleteManyByMovie(id);

    return { message: MOVIE_MESSAGES.MOVIE_DELETED };
  }
}
