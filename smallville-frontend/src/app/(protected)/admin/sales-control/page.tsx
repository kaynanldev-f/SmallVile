import {
  getTicketPricing,
  listSalesControlSessions,
} from "@/src/actions/admin/salesControlActions";
import SalesControlManager from "@/src/components/admin/sales/SalesControlManager";
import { WEEKDAYS, Weekday } from "@/src/types/sales-control";

export const metadata = {
  title: "Controle de Vendas | Admin Cineville",
};

/** Área administrativa de controle de venda. */
export default async function AdminSalesControlPage() {
  const [pricing, sessions] = await Promise.all([
    getTicketPricing(),
    listSalesControlSessions(),
  ]);

  const loadError = !pricing.success
    ? pricing.error
    : !sessions.success
      ? sessions.error
      : undefined;

  return (
    <SalesControlManager
      pricing={
        pricing.success
          ? pricing.data
          : {
              defaultPrices: { INTEIRA: 0, MEIA: 0 },
              weekdayRules: WEEKDAYS.map((day) => ({
                weekday: day.value as Weekday,
                enabled: false,
                prices: { INTEIRA: 0, MEIA: 0 },
              })),
            }
      }
      sessions={sessions.success ? sessions.data : []}
      loadError={loadError}
    />
  );
}
