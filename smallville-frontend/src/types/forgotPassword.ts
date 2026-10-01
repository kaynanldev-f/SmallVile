export interface ForgotPasswordState<T> {
  success: boolean;
  message: string;
  inputs: T;
  errors?: {
    email?: string[];
  };
}

export interface ResetPasswordState<T> {
  success: boolean;
  message: string;
  inputs: T;
  /** O link não serve mais: token ausente, desconhecido, expirado ou já usado. */
  invalidToken?: boolean;
  errors?: {
    token?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
}
