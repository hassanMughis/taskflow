import { DashboardGuard } from "../../components/auth/dashboard-guard";
import { WorkspaceMembers } from "../../components/workspace/workspace-members";

export default async function WorkspaceMembersPage({ searchParams }: { searchParams: Promise<{ workspaceId?: string | string[] }> }) {
  const value = (await searchParams).workspaceId;
  const workspaceId = Array.isArray(value) ? value[0] ?? null : value ?? null;
  return <DashboardGuard><WorkspaceMembers selectedWorkspaceId={workspaceId} /></DashboardGuard>;
}
