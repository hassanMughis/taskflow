import { DashboardGuard } from "../components/auth/dashboard-guard";
import { NotificationsPage } from "../components/notifications/notifications-page";

export default function NotificationsRoute() {
  return <DashboardGuard><NotificationsPage /></DashboardGuard>;
}
