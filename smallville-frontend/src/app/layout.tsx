import type { Metadata } from "next";
import { montserrat, inter } from "@/src/lib/fonts";
import { AuthProvider } from "../context/AuthContext";
import { getSessionUser } from "../lib/auth";
import "./globals.css";
import SuportButton from "../components/ui/SuportButton";
import { OrderProvider } from "../context/OrderContext";


export const metadata: Metadata = {
  title: {
    default: "Cineville",
    template: "%s | Cineville",
  },
  description:
    "Compre ingressos, escolha sua sessão e monte sua bomboniere no Cineville.",
  icons: {
    icon: "/assets/c-fav-icon.jpg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  return (
    <html lang="pt-BR" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="bg-secondary-700 min-h-screen">
        <AuthProvider initialUser={user}>
          <OrderProvider>
            {children}
            <SuportButton phone="99999999999" />
          </OrderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
