import { BackendSeat, SeatRow } from "../utils/seat-rows";
import { SelectedSeat } from "@/src/hooks/useSeatSelection";
import { TicketType } from "./ticket";
import {
  BackendSessionSalesEnvelope,
  SalesStatus,
  TicketPriceSet,
} from "./sales-control";

export type SeatType =
  | "comum"
  | "preferencial"
  | "cadeirante"
  | "acompanhante"
  | "obesa"
  | "indisponivel";

export interface SessionInfo {
  movieTitle: string;
  city: string;
  date: string;
  time: string;
  /**
   * "DD/MM/AAAA HH:MM" exatamente como `Session.dateTime` está gravado.
   * `date` e `time` são rótulos de exibição ("15 Nov", "20h30"); a checagem de
   * sessão já realizada precisa do instante completo.
   */
  dateTime: string;

  audio: string;

  room: string;

  screenType: string;

  price?: number;

  /** Estado de venda resolvido pelo backend. */
  salesStatus?: SalesStatus;
  /** "DD/MM/AAAA HH:MM" */
  salesStartAt?: string;
  salesEndAt?: string;
  /** Preços oficiais de inteira e meia desta sessão, em centavos. */
  prices?: TicketPriceSet;
}

export interface SeatProps {
  /** Ex.: "A10". Usado no aria-label e no title do assento. */
  seatNumber: string;
  type: SeatType;
  isSelected: boolean;
  onClick: () => void;
}

export interface SeatMapHeaderProps {
  onClose: () => void;
}

export interface SeatGridProps {
  seatRows: SeatRow[];
  selectedSeats: SelectedSeat[];
  toggleSeat: (
    seatNumber: string,
    seatType: SeatType,
    ticketType?: TicketType,
  ) => void;
  screenType: string;
  room: string;
}

export interface SeatMapSidebarProps {
  totalSeatsCount: number;
  selectedCount: number;
}

export interface TicketTypesPanelProps {
  selectedSeats: SelectedSeat[];
  /** Preço da sessão em centavos — base da prévia de inteira e meia. */
  sessionPrice?: number;
  /** Tabela oficial da sessão, quando o backend a devolve. */
  prices?: TicketPriceSet;
  onChangeType: (seatNumber: string, ticketType: TicketType) => void;
}

export interface SeatMapFooterProps {
  session: SessionInfo;
  selectedCount: number;
  onConfirm: () => void;
  isLoading: boolean;
  /** Motivo pelo qual a compra está bloqueada, quando estiver. */
  blockedMessage?: string;
}

export interface BackendSession extends BackendSessionSalesEnvelope {
  _id: string;
  cinemaId: string;
  movieId: string;
  movieTitle: string;
  roomName: string;
  roomType: string;
  dateTime: string;
  price: number;
  seats: BackendSeat[];
}

export interface BackendCinema {
  id: string;
  name: string;
  city: string;
}
