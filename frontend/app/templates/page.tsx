import { DashboardGuard } from "../components/auth/dashboard-guard";
import { TemplatesOverview } from "../components/dashboard/templates-overview";

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  return <DashboardGuard><TemplatesOverview initialQuery={query} /></DashboardGuard>;
}
