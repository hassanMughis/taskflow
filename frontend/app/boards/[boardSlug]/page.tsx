import { DashboardGuard } from "../../components/auth/dashboard-guard";
import { BoardView } from "../../components/board/board-view";

export default async function BoardPage({ params }: PageProps<"/boards/[boardSlug]">) {
  const { boardSlug } = await params;

  return (
    <DashboardGuard>
      <BoardView boardSlug={boardSlug} />
    </DashboardGuard>
  );
}
