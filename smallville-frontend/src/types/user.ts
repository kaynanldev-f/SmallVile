/** Usuários cadastrados — o que `GET /users` realmente devolve. */
export interface AdminUser {
  id: string;
  name: string;
  surname?: string;
  email: string;
  /** "000.000.000-00". */
  cpf?: string;
  /** "(00) 00000-0000". */
  phone?: string;
  /** "DD/MM/AAAA". */
  birthDate?: string;
  city?: string;
  /** UF, duas letras. */
  state?: string;
  gender?: string;
  /** ISO 8601 — `timestamps: true` no schema. */
  createdAt?: string;
}

/** Uma página de `GET /users?page=&limit=`, com o `meta` do backend. */
export interface AdminUsersPage {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
