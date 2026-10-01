export enum TicketStatus {
  VALID = 'valido',
  USED = 'utilizado',
  CANCELLED = 'cancelado',
}

// Um ingresso só pode ser validado na portaria enquanto estiver válido.
export const SCANNABLE_TICKET_STATUSES: TicketStatus[] = [TicketStatus.VALID];
