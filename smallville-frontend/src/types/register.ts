export interface User {
  _id: string;
  name: string;
  surname: string;
  email: string;
}

export interface RegisterApiResponse {
  message: string;
  data: User;
}

export type RegisterState<T = unknown> = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  inputs?: T;
};
