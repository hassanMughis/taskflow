import { DashboardGuard } from "../components/auth/dashboard-guard";
import { WorkspaceOverview } from "../components/workspace/workspace-overview";

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ workspaceId?: string | string[] }> }) {
  const value = (await searchParams).workspaceId;
  const workspaceId = Array.isArray(value) ? value[0] ?? null : value ?? null;
  return <DashboardGuard><WorkspaceOverview selectedWorkspaceId={workspaceId} /></DashboardGuard>;
}
