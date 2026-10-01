import { getSalesAnalytics } from "@/src/actions/admin/analyticsActions";
import AnalyticsDashboard from "@/src/components/admin/analytics/AnalyticsDashboard";
import {
  parseAnalyticsPeriod,
  resolveAnalyticsRange,
} from "@/src/utils/analytics";

export const metadata = {
  title: "Analytics | Admin Cineville",
};

/** Dashboard de vendas. */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period: periodParam, from, to } = await searchParams;

  const period = parseAnalyticsPeriod(periodParam);
  const range = resolveAnalyticsRange(period, from, to);

  const result = await getSalesAnalytics(range);

  return (
    <AnalyticsDashboard
      period={period}
      analytics={result.success ? result.data : undefined}
      fallbackRange={range}
      loadError={result.success ? undefined : result.error}
    />
  );
}
