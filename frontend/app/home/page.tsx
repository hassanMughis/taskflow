import { DashboardGuard } from "../components/auth/dashboard-guard";
import { HomeOverview } from "../components/dashboard/home-overview";

export default function HomePage() {
  return <DashboardGuard><HomeOverview /></DashboardGuard>;
}
