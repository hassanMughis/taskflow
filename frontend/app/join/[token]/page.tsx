import { JoinWorkspace } from "../../components/workspace/join-workspace";

export default async function JoinWorkspacePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinWorkspace token={token} />;
}
