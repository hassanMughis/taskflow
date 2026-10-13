import { DashboardGuard } from "../components/auth/dashboard-guard";
import { PlannerView } from "../components/planner/planner-view";

export default function PlannerPage() {
  return <DashboardGuard><PlannerView /></DashboardGuard>;
}
