import { Injectable } from '@nestjs/common';
import { SessionsService } from 'src/session/services/session.service';
import { SessionInfoGateway, SessionOrderInfo } from './session-info.gateway';

@Injectable()
export class SessionInfoAdapter implements SessionInfoGateway {
  constructor(private readonly sessionsService: SessionsService) {}

  async getSessionStartDate(sessionId: string): Promise<Date | null> {
    try {
      const session = await this.sessionsService.findOne(sessionId);
      return session.dateTime ? new Date(session.dateTime) : null;
    } catch {
      return null;
    }
  }

  async getSessionForOrder(
    sessionId: string,
  ): Promise<SessionOrderInfo | null> {
    try {
      const session = await this.sessionsService.findOne(sessionId);
      return {
        price: session.price,
        movieId: session.movieId,
        seats: session.seats.map((s) => ({
          seatNumber: s.seatNumber,
          isOccupied: s.isOccupied,
        })),
      };
    } catch {
      return null;
    }
  }
}
