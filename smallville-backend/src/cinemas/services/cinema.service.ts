import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { CreateCinemaDto } from '../dtos/create-cinema.dto';
import { UpdateCinemaDto } from '../dtos/update-cinema.dto';
import { SessionsService } from '../../session/services/session.service';
import { MoviesService } from '../../movies/services/movies.service';
import { CINEMA_MESSAGES } from '../messages/cinema.messages';
import { Cinema, CinemaDocument } from '../schema/cinema.schema';

@Injectable()
export class CinemasService {
  constructor(
    @InjectModel(Cinema.name)
    private cinemaModel: Model<CinemaDocument>,
    @Inject(forwardRef(() => SessionsService))
    private sessionsService: SessionsService,
    @Inject(forwardRef(() => MoviesService))
    private moviesService: MoviesService,
  ) {}

  async create(createCinemaDto: CreateCinemaDto): Promise<CinemaDocument> {
    const cinemaExists = await this.findByName(createCinemaDto.name);

    if (cinemaExists) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_ALREADY_EXISTS },
        HttpStatus.CONFLICT,
      );
    }

    const cinema = new this.cinemaModel({
      ...createCinemaDto,
      name: createCinemaDto.name.trim(),
    });

    return cinema.save();
  }

  async findByName(name: string): Promise<CinemaDocument | null> {
    return this.cinemaModel.findOne({ name }).exec();
  }

  async findAll(name?: string): Promise<CinemaDocument[]> {
    const filter = name ? { name: { $regex: name, $options: 'i' } } : {};

    return this.cinemaModel.find(filter).exec();
  }

  /**
   * Cinemas de uma lista de IDs em uma consulta só — usada pelos detalhes do
   * filme para saber a cidade de cada sessão sem uma ida ao banco por cinema.
   */
  async findManyByIds(ids: string[]): Promise<CinemaDocument[]> {
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return [];
    }

    return this.cinemaModel.find({ _id: { $in: validIds } }).exec();
  }

  async findOne(id: string): Promise<CinemaDocument> {
    this.validateId(id);

    const cinema = await this.cinemaModel.findById(id).exec();

    if (!cinema) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return cinema;
  }

  async details(id: string) {
    this.validateId(id);

    const cinema = await this.cinemaModel
      .findById(id)
      .populate('movies')
      .exec();

    if (!cinema) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    const sessions = await this.sessionsService.findByCinema(
      cinema._id.toString(),
    );

    return {
      cinema: {
        id: cinema._id,
        name: cinema.name,
        address: cinema.address,
        city: cinema.city,
        state: cinema.state,
        status: cinema.status,
      },
      movies: cinema.movies,
      sessions,
    };
  }

  async update(
    id: string,
    updateCinemaDto: UpdateCinemaDto,
  ): Promise<CinemaDocument> {
    this.validateId(id);

    const cinema = await this.cinemaModel
      .findByIdAndUpdate(id, updateCinemaDto, { new: true })
      .exec();

    if (!cinema) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return cinema;
  }

  async remove(id: string): Promise<void> {
    this.validateId(id);

    const cinema = await this.cinemaModel.findByIdAndDelete(id).exec();
    if (!cinema) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
  }
  async attachMovie(
    cinemaId: string,
    movieId: string,
  ): Promise<CinemaDocument> {
    this.validateId(cinemaId);

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.MOVIE_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.moviesService.findOne(movieId);

    const cinema = await this.findOne(cinemaId);

    const alreadyAttached = cinema.movies.some(
      (id) => id.toString() === movieId,
    );

    if (alreadyAttached) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.MOVIE_ALREADY_ATTACHED },
        HttpStatus.CONFLICT,
      );
    }

    cinema.movies.push(movieId);
    return cinema.save();
  }

  async detachMovie(
    cinemaId: string,
    movieId: string,
  ): Promise<CinemaDocument> {
    this.validateId(cinemaId);

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.MOVIE_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    const cinema = await this.findOne(cinemaId);

    const isAttached = cinema.movies.some((id) => id.toString() === movieId);

    if (!isAttached) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.MOVIE_NOT_ATTACHED },
        HttpStatus.NOT_FOUND,
      );
    }

    cinema.movies = cinema.movies.filter((id) => id.toString() !== movieId);

    return cinema.save();
  }

  private validateId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: CINEMA_MESSAGES.CINEMA_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
