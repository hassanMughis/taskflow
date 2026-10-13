import { DashboardGuard } from "../components/auth/dashboard-guard";
import { InboxView } from "../components/inbox/inbox-view";

export default function InboxPage() {
  return <DashboardGuard><InboxView /></DashboardGuard>;
}
