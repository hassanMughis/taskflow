import { DashboardGuard } from "../components/auth/dashboard-guard";
import { DashboardShell } from "../components/dashboard/dashboard-shell";

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <DashboardShell />
    </DashboardGuard>
  );
}
