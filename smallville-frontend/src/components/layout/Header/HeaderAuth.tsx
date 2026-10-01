"use client";

import { useAuth } from "@/src/context/AuthContext";
import HeaderGuest from "./HeaderGuest";
import HeaderUser from "./HeaderUser";

export default function HeaderAuth() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <HeaderUser /> : <HeaderGuest />;
}
