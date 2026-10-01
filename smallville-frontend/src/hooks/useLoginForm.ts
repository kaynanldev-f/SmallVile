"use client";

import { useActionState, useEffect, useState, ChangeEvent } from "react";
import { loginAction } from "@/src/actions/authAction";
import { LoginState } from "../types";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

const initialState: LoginState = {
  success: false,
  error: undefined,
  user: undefined,
};

interface LoginFormValues {
  email?: string;
  password?: string;
}

export function useLoginForm() {
  const { setUser } = useAuth();
  const router = useRouter();

  const [formValues, setFormValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  useEffect(() => {
    if (state.success && state.user) {
      setUser(state.user);

      const timer = setTimeout(() => {
        setFormValues({ email: "", password: "" });
      }, 0);

      router.push("/home");

      return () => clearTimeout(timer);
    }
  }, [state, setUser, router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return {
    state,
    formAction,
    isPending,
    showPassword,
    togglePassword,
    formValues,
    handleChange,
    setFormValues,
  };
}
