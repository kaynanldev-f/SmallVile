export const TICKETS_MESSAGES = {
  TICKET_CREATED: 'Ingresso emitido com sucesso.',
  TICKETS_FOUND: 'Ingressos encontrados.',
  TICKET_FOUND: 'Ingresso encontrado.',
  TICKET_NOT_FOUND: 'Ingresso não encontrado.',
  TICKET_DELETED: 'Ingresso cancelado com sucesso.',
  TICKET_ID_INVALID: 'ID de ingresso inválido.',
  TICKET_FORBIDDEN: 'Você não tem permissão para acessar este ingresso.',
  TICKET_PDF_FAILED:
    'Não foi possível gerar o PDF do ingresso. Tente novamente.',
  TICKET_PDF_NOT_AVAILABLE:
    'O PDF deste ingresso ainda não está disponível. O pagamento precisa estar aprovado.',
  USER_NOT_ELIGIBLE:
    'Usuário não possui idade suficiente para comprar este ingresso.',
  MOVIE_NOT_FOUND: 'O filme informado não existe.',

  SESSION_NOT_FOUND: 'A sessão informada não existe.',
  SEAT_NOT_FOUND: (seat: string) => `O assento ${seat} não existe nesta sala.`,
  SEAT_ALREADY_OCCUPIED: (seat: string) =>
    `O assento ${seat} já está ocupado por outro cliente.`,

  FIELD_REQUIRED: (field: string) => `O campo ${field} é obrigatório.`,
  FIELD_IS_MONGO_ID: (field: string) =>
    `O campo ${field} deve ser un ID válido do MongoDB.`,
  FIELD_LENGTH_BETWEEN: (field: string, min: number, max: number) =>
    `O campo ${field} deve ter entre ${min} e ${max} caracteres.`,
  FIELD_INVALID_FORMAT: (field: string, format: string) =>
    `O campo ${field} deve seguir o formato: ${format}.`,
};
