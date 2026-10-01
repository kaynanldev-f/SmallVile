"use client";

import { useRouter } from "next/navigation";
import Button from "@/src/components/ui/Button";

export default function HeaderGuest() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  const handleRegister = () => {
    router.push("/register");
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden sm:block">
        <Button variant="primary" onClick={handleLogin}>
          Login
        </Button>
      </div>

      <div className="hidden sm:block">
        <Button variant="secondary" onClick={handleRegister}>
          Cadastrar
        </Button>
      </div>
    </div>
  );
}
