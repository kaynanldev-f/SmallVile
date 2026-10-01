export interface SessionSeatInfo {
  seatNumber: string;
  isOccupied: boolean;
}

export interface SessionOrderInfo {
  price: number;
  movieId: string;
  seats: SessionSeatInfo[];
}

export const SESSION_INFO_GATEWAY = 'SESSION_INFO_GATEWAY';

export interface SessionInfoGateway {
  getSessionStartDate(sessionId: string): Promise<Date | null>;
  getSessionForOrder(sessionId: string): Promise<SessionOrderInfo | null>;
}
