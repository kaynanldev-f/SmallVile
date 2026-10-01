"use client";

import {
  ChangeEvent,
  FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { RegisterUser } from "../actions/registerActions";
import { RegisterState } from "../types";
import { flatten, safeParse, InferInput } from "valibot";
import { registerSchema } from "../lib/schemas/registerSchema";
import { formatDate } from "../utils/date";
import { useRouter } from "next/navigation";
export type RegisterInput = InferInput<typeof registerSchema>;

const initialState: RegisterState<Partial<RegisterInput>> = {
  success: false,
  errors: {},
  inputs: {},
};

/** Quanto tempo o modal de sucesso fica na tela antes de levar ao login. */
const SUCCESS_MODAL_DURATION_MS = 4500;

export function useRegisterForm(setIsLogin?: (value: boolean) => void) {
  const [state, formAction, isPending] = useActionState(
    RegisterUser,
    initialState,
  );

  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * O modal é derivado do resultado do cadastro, não copiado para outro
   * estado: ele está aberto enquanto o cadastro deu certo e ninguém o fechou.
   */
  const [modalDismissed, setModalDismissed] = useState(false);

  const showSuccessModal = state.success && !modalDismissed;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [formValues, setFormValues] = useState<Partial<RegisterInput>>({});

  const [clientErrors, setClientErrors] = useState<
    Partial<Record<keyof RegisterInput, string[]>>
  >({});

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );

  /** A única responsabilidade do efeito é o timer — nada de estado copiado aqui. */
  useEffect(() => {
    if (!state.success || modalDismissed) return;

    redirectTimer.current = setTimeout(() => {
      redirectTimer.current = null;
      setModalDismissed(true);
      router.push("/login");
    }, SUCCESS_MODAL_DURATION_MS);

    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
        redirectTimer.current = null;
      }
    };
  }, [state.success, modalDismissed, router]);

  /**
   * Fechar o modal antes do prazo não deixa o usuário parado na tela de
   * cadastro: cancela o timer pendente (para não sobrar um `router.push`
   * atrasado) e segue para o login na hora.
   */
  const handleCloseModal = () => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }

    setModalDismissed(true);

    if (setIsLogin) {
      setIsLogin(true);
      return;
    }

    router.push("/login");
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const name = e.target.name as keyof RegisterInput;

    const valorReal =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;

    setFormValues((prev) => ({
      ...prev,
      [name]: valorReal,
    }));

    setTouchedFields((prev) => ({
      ...prev,
      [name]: true,
    }));

    if (clientErrors[name]) {
      setClientErrors((prev) => {
        const novo = { ...prev };
        delete novo[name];
        return novo;
      });
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const number = formData.get("number")?.toString().trim();
    const complement = formData.get("complement")?.toString().trim();
    const gender = formData.get("gender")?.toString().trim();
    console.log(Object.fromEntries(formData.entries()));
    const dataToValidate = {
      name: formData.get("name")?.toString() || "",
      surname: formData.get("surname")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      password: formData.get("password")?.toString() || "",
      confirmPassword: formData.get("confirmPassword")?.toString() || "",
      termsAccepted: formData.get("termsAccepted") !== null,
      privacyAccepted: formData.get("privacyAccepted") !== null,
      cpf: formData.get("cpf")?.toString() || "",
      birthDate: formatDate(formData.get("birthDate")?.toString() || ""),
      phone: formData.get("phone")?.toString() || "",
      cep: formData.get("cep")?.toString() || "",
      address: formData.get("address")?.toString() || "",
      number: number || undefined,
      complement: complement || undefined,
      neighborhood: formData.get("neighborhood")?.toString() || "",
      city: formData.get("city")?.toString() || "",
      state: formData.get("state")?.toString() || "",
      gender: gender || undefined,
    };

    const resultado = safeParse(registerSchema, dataToValidate);

    if (!resultado.success) {
      e.preventDefault();
      const issues = flatten(resultado.issues).nested;
      console.log(resultado.issues);
      setClientErrors(issues as Partial<Record<keyof RegisterInput, string[]>>);
    }
  };

  /**
   * Cadastro concluído esvazia o formulário por trás do modal — antes isso era
   * feito com três `setState` dentro do efeito.
   */
  const getValue = (field: keyof RegisterInput): string => {
    if (state.success) return "";

    const val = formValues[field] ?? state.inputs?.[field];
    return val !== null && val !== undefined && typeof val !== "boolean"
      ? String(val)
      : "";
  };

  const getChecked = (field: keyof RegisterInput): boolean => {
    if (state.success) return false;

    const val = formValues[field] ?? state.inputs?.[field];
    return Boolean(val);
  };

  const getError = (field: keyof RegisterInput) => {
    if (state.success) return undefined;

    const isDirty = touchedFields[field as string];
    if (clientErrors[field]) return clientErrors[field]![0];
    if (!isDirty && state.errors?.[field]) return state.errors[field]![0];
    return undefined;
  };

  const togglePassword = () => setShowPassword((p) => !p);
  const toggleConfirmPassword = () => setShowConfirmPassword((p) => !p);
  const togglePin = () => setShowPin((p) => !p);

  return {
    state,
    formAction,
    isPending,
    handleChange,
    handleSubmit,
    getValue,
    getChecked,
    getError,
    showPassword,
    togglePassword,
    showConfirmPassword,
    toggleConfirmPassword,
    showPin,
    togglePin,
    showSuccessModal,
    handleCloseModal,
  };
}
