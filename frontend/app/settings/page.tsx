import { DashboardGuard } from "../components/auth/dashboard-guard";
import { AccountSettings } from "../components/settings/account-settings";

export default function SettingsPage() {
  return <DashboardGuard><AccountSettings /></DashboardGuard>;
}
