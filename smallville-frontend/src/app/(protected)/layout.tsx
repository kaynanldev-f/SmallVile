import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrderProvider } from "@/src/context/OrderContext";
import Header from "@/src/components/layout/Header";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  return (
    <OrderProvider>
      <Header />
      {children}
    </OrderProvider>
  );
}
