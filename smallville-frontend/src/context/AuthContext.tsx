"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { logoutAction } from "../actions/authAction";
import { useRouter } from "next/navigation";
import { UserPayload, AuthContextType } from "../types";

const AuthContext = createContext({} as AuthContextType);

/** Assinatura do que o servidor mandou. */
function identityKey(user: UserPayload | null): string {
  if (!user) return "";

  return [
    user.sub,
    user.name,
    user.surname,
    user.email,
    user.city,
    user.role,
  ].join("|");
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: UserPayload | null;
}) {
  const [user, setUser] = useState<UserPayload | null>(initialUser || null);

  // Reagir a `initialUser` novo (login, logout, perfil salvo) sem desfazer o
  // que `updateUser` mudou no cliente.
  const serverKey = identityKey(initialUser);
  const [seededKey, setSeededKey] = useState(serverKey);

  if (seededKey !== serverKey) {
    setSeededKey(serverKey);
    setUser(initialUser || null);
  }

  const router = useRouter();

  /** Atualiza os dados de exibição do usuário logado sem refazer a sessão. */
  function updateUser(changes: Partial<UserPayload>) {
    setUser((current) => (current ? { ...current, ...changes } : current));
  }

  async function logout() {
    await logoutAction();
    setUser(null);
    router.refresh();
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        updateUser,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "ADMIN",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
