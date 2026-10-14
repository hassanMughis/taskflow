"use client";

import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, Pencil, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../../lib/api-client";
import { BoardActionsMenu } from "../board/board-actions-menu";
import { DashboardShell } from "../dashboard/dashboard-shell";
import { Icon } from "../dashboard/dashboard-icon";

type Workspace = {
  id: string;
  name: string;
  isPrivate: boolean;
  boards: ApiBoard[];
};

type WorkspaceBoard = { id: string; name: string; slug: string; cover: string | null; members: string[]; canManage: boolean };
type ApiBoard = { id: string; ownerId: string; title: string; slug: string; coverUrl: string | null; members?: Array<{ id: string; name: string; BoardMember?: { role: string } }> };

type WorkspaceResponse = {
  workspace: Workspace & { ownerId: string; members?: Array<{ id: string; WorkspaceMember?: { role: string } }> };
};
type BoardsResponse = { boards: ApiBoard[] };

function BoardTile({ board, archived = false, onRenamed, onStatusChange, onError }: { board: WorkspaceBoard; archived?: boolean; onRenamed: (boardId: string, title: string) => void; onStatusChange: (board: WorkspaceBoard, mode: "archived" | "restored" | "deleted") => void; onError: (message: string) => void }) {
  return (
    <div className="relative w-[238px] shrink-0">
    <Link href={`/boards/${board.slug}`} className="block h-[120px] overflow-hidden rounded-lg border border-[#091e4224] bg-white shadow-sm transition hover:brightness-[0.97] dark:border-black/60 dark:bg-[#22272b] dark:hover:brightness-110">
      <div className="relative flex h-20 items-center justify-center bg-[#dfe1e6] text-[#626f86] dark:bg-[#2c333a] dark:text-[#b6c2cf]">
        {board.cover ? <Image src={board.cover} alt="" fill sizes="238px" className="object-cover" /> : <Icon name="grid" size={26} />}
        {board.cover ? <span className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" /> : null}
      </div>
      <div className="flex h-10 items-center bg-white px-2 text-[#172b4d] dark:bg-[#22272b] dark:text-[#f1f2f4]"><h2 className="truncate text-sm font-medium">{board.name}</h2></div>
    </Link>
    {board.canManage ? <BoardActionsMenu boardId={board.id} title={board.name} archived={archived} onRenamed={(title) => onRenamed(board.id, title)} onRemoved={(mode) => onStatusChange(board, mode)} onError={onError} /> : null}
    </div>
  );
}

export function WorkspaceOverview({ selectedWorkspaceId }: { selectedWorkspaceId: string | null }) {
  const [workspaceName, setWorkspaceName] = useState("Loading...");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspacePrivate, setWorkspacePrivate] = useState(true);
  const [canManageWorkspace, setCanManageWorkspace] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [allBoards, setAllBoards] = useState<WorkspaceBoard[]>([]);
  const [closedBoards, setClosedBoards] = useState<WorkspaceBoard[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const workspaceId = selectedWorkspaceId;

        if (!workspaceId) {
          setWorkspaceName("No workspace selected");
          setWorkspaceError("Select a workspace from the dashboard.");
          return;
        }

        const [data, boardsData, userData] = await Promise.all([
          apiGet<WorkspaceResponse>(`/workspaces/${workspaceId}`),
          apiGet<BoardsResponse>(`/boards?workspaceId=${workspaceId}`),
          apiGet<{ user: { id: string } }>("/auth/me"),
        ]);
        if (cancelled) return;

        setWorkspaceId(data.workspace.id);
        setWorkspaceName(data.workspace.name);
        setWorkspacePrivate(data.workspace.isPrivate);
        const currentWorkspaceMembership = data.workspace.members?.find((member) => String(member.id) === String(userData.user.id));
        setCanManageWorkspace(String(data.workspace.ownerId) === String(userData.user.id) || ["owner", "admin"].includes(currentWorkspaceMembership?.WorkspaceMember?.role ?? ""));
        setAllBoards(boardsData.boards.map((board) => ({
          id: board.id,
          name: board.title,
          slug: board.slug,
          cover: board.coverUrl,
          members: (board.members ?? []).map((member) => member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()),
          canManage: String(data.workspace.ownerId) === String(userData.user.id) || String(board.ownerId) === String(userData.user.id) || ["owner", "admin"].includes(board.members?.find((member) => String(member.id) === String(userData.user.id))?.BoardMember?.role ?? ""),
        })));
        setWorkspaceError(null);
      } catch (error) {
        if (!cancelled) {
          setWorkspaceError(error instanceof Error ? error.message : "Failed to load workspace");
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  async function saveWorkspaceName() {
    const name = workspaceName.trim();
    if (!name || !workspaceId || !canManageWorkspace) return;
    try {
      await apiPatch(`/workspaces/${workspaceId}`, { name });
      setWorkspaceName(name);
      setWorkspaceError(null);
      setEditingName(false);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to rename workspace");
    }
  }

  async function toggleClosedBoards() {
    const nextShown = !showClosed;
    setShowClosed(nextShown);
    if (!nextShown || !workspaceId) return;
    try {
      const data = await apiGet<{ boards: ApiBoard[] }>(`/boards?workspaceId=${workspaceId}&archived=true`);
      let currentUserId = "";
      try { currentUserId = String(JSON.parse(localStorage.getItem("kanvero_user") ?? "null")?.id ?? ""); } catch {}
      setClosedBoards(data.boards.map((board) => ({ id: board.id, name: board.title, slug: board.slug, cover: board.coverUrl, members: (board.members ?? []).map((member) => member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()), canManage: board.members?.some((member) => String(member.id) === currentUserId && ["owner", "admin"].includes(member.BoardMember?.role ?? "")) ?? false })));
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to load archived boards");
    }
  }

  function renameBoard(boardId: string, title: string) {
    setAllBoards((current) => current.map((board) => board.id === boardId ? { ...board, name: title } : board));
    setClosedBoards((current) => current.map((board) => board.id === boardId ? { ...board, name: title } : board));
    setWorkspaceError(null);
  }

  function changeBoardStatus(board: WorkspaceBoard, mode: "archived" | "restored" | "deleted") {
    setAllBoards((current) => mode === "restored" ? [...current.filter((item) => item.id !== board.id), board] : current.filter((item) => item.id !== board.id));
    setClosedBoards((current) => mode === "archived" ? [...current.filter((item) => item.id !== board.id), board] : current.filter((item) => item.id !== board.id));
    setWorkspaceError(null);
  }

  return (
    <DashboardShell active="Workspaces" workspaceId={selectedWorkspaceId}>
      <div className="mx-auto max-w-[1005px]">
        <section className="border-b border-[#dcdfe4] pb-[52px] dark:border-[#3d4145]">
          <div className="flex items-center gap-3.5 pl-9">
            <span className="flex h-[66px] w-[66px] items-center justify-center rounded-md bg-gradient-to-b from-[#d93b2b] to-[#ffab00] text-[36px] font-medium text-white">{workspaceName.charAt(0).toUpperCase()}</span>
            <div><div className="flex items-center gap-2">{editingName ? <input autoFocus value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} onBlur={saveWorkspaceName} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label="Workspace name" className="h-10 min-w-0 rounded-md border border-[#0c66e4] bg-white px-2 text-[20px] font-semibold text-[#172b4d] outline-none dark:bg-[#22272b] dark:text-[#f1f2f4]" /> : <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#172b4d] dark:text-[#f1f2f4]">{workspaceName}</h1>}{canManageWorkspace ? <button type="button" onClick={() => setEditingName(true)} aria-label="Edit workspace name" className="text-[#44546f] hover:text-[#0c66e4] dark:text-[#b6c2cf] dark:hover:text-[#579dff]"><Pencil size={17} /></button> : null}</div><p className="mt-1 flex items-center gap-1.5 text-sm text-[#44546f] dark:text-[#b6c2cf]"><LockKeyhole size={15} />{workspacePrivate ? "Private" : "Public"}</p>{workspaceError ? <p className="mt-1 text-sm text-red-600">{workspaceError}</p> : null}</div>
          </div>
        </section>

        <section className="mt-[22px] pl-4">
          <div className="flex items-center gap-3"><UserRound size={24} className="text-[#172b4d] dark:text-[#f1f2f4]" /><h2 className="text-lg font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Your boards</h2></div>
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,238px)] gap-3">
            {allBoards.map((board) => <BoardTile key={board.slug} board={board} onRenamed={renameBoard} onStatusChange={changeBoardStatus} onError={setWorkspaceError} />)}
            <Link href={workspaceId ? `/dashboard?create=1&workspaceId=${workspaceId}` : "/dashboard"} className="flex h-[120px] w-[238px] items-center justify-center rounded-lg border border-[#091e4224] bg-[#091e420f] text-sm font-medium text-[#44546f] transition hover:bg-[#091e4214] dark:border-black/60 dark:bg-[#282e33] dark:text-[#b6c2cf] dark:hover:bg-[#323940]">Create new board</Link>
          </div>
          <button type="button" onClick={toggleClosedBoards} className="mt-7 rounded-lg border border-[#cecedb] px-4 py-2 text-sm font-medium text-[#44546f] transition hover:border-[#8c7cea] hover:text-[#0c66e4] dark:border-[#454f59] dark:text-[#b6c2cf] dark:hover:border-[#579dff] dark:hover:text-[#85b8ff]">{showClosed ? "Hide closed boards" : "View all closed boards"}</button>
          {showClosed && closedBoards.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{closedBoards.map((board) => <BoardTile key={board.id} board={board} archived onRenamed={renameBoard} onStatusChange={changeBoardStatus} onError={setWorkspaceError} />)}</div> : null}
      {showClosed && !closedBoards.length ? <p className="mt-4 rounded-lg border border-[#dcdfe4] bg-white p-5 text-sm text-[#44546f] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#b6c2cf]">There are no closed boards.</p> : null}
        </section>
      </div>
    </DashboardShell>
  );
}

