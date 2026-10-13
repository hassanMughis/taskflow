"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost } from "../../lib/api-client";
import { BoardActionsMenu } from "../board/board-actions-menu";
import { CreateBoardDialog, DEFAULT_BOARD_COVER } from "./create-board-dialog";
import { Icon } from "./dashboard-icon";

type AppSection = "Boards" | "Templates" | "Home" | "Planner" | "Inbox" | "Notifications" | "Workspaces" | "Settings";

type DashboardShellProps = {
  active?: AppSection;
  children?: React.ReactNode;
  workspaceId?: string | null;
};

type ApiMember = { id: string; name: string; BoardMember?: { role: string } };
type ApiBoard = { id: string; ownerId: string; title: string; slug: string; coverUrl: string | null; members: ApiMember[] };
type ApiWorkspaceMember = { id: string; WorkspaceMember?: { role: string } };
type ApiWorkspace = { id: string; ownerId: string; name: string; isPrivate: boolean; members?: ApiWorkspaceMember[] };
type WorkspacesResponse = { workspaces: ApiWorkspace[] };
type BoardsResponse = { boards: ApiBoard[] };
type DashboardBoard = { id: string; workspaceId: string; title: string; slug: string; cover: string | null; members: string[]; canManage: boolean };
type DashboardWorkspace = ApiWorkspace & { boards: DashboardBoard[]; canManage: boolean };
type CurrentUser = { id: string; name: string; email: string };
type GlobalSearchBoard = { id: string; title: string; slug: string; coverUrl: string | null };
type GlobalSearchCard = { id: string; title: string; list: { id: string; title: string; board: { id: string; title: string; slug: string } } };

const templates = [
  { title: "Product launch", caption: "Plan every milestone", icon: "rocket" as const },
  { title: "Sprint planning", caption: "Ship work with focus", icon: "tasks" as const },
  { title: "Campaign workflow", caption: "Bring ideas to market", icon: "megaphone" as const },
];

const templateCategories = ["Business", "Design", "Education", "Engineering", "Marketing", "HR & Operations", "Personal", "Productivity", "Product management", "Project management", "Remote work", "Sales", "Support", "Team management"];

function Avatar({ label, index = 0 }: { label: string; index?: number }) {
  const colors = ["bg-[#ffcf9f]", "bg-[#a6c6fb]", "bg-[#dab9ff]"];
  return <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-[#2e3040] ${colors[index % colors.length]}`}>{label}</span>;
}

function NavItem({ icon, label, href, active, compact }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; href: string; active: boolean; compact: boolean }) {
  return <Link href={href} title={compact ? label : undefined} className={`flex h-10 items-center rounded-lg text-sm font-medium transition ${compact ? "justify-center" : "gap-3 px-3"} ${active ? "bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]" : "text-[#172b4d] hover:bg-[#091e420f] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]"}`}><Icon name={icon} size={18} />{compact ? null : label}</Link>;
}

function catToSlug(cat: string) {
  return cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
}

function Sidebar({ active, collapsed, onToggle, activeSubSlug, onSettings, membersActive, workspaces, selectedWorkspaceId }: { active: AppSection; collapsed: boolean; onToggle: () => void; activeSubSlug: string | null; onSettings: (workspaceId: string) => void; membersActive: boolean; workspaces: DashboardWorkspace[]; selectedWorkspaceId: string | null }) {
  const [workspaceExpansion, setWorkspaceExpansion] = useState<{ id: string; expanded: boolean } | null>(null);

  return (
    <aside className={`fixed bottom-0 left-0 top-[52px] z-30 hidden flex-col overflow-y-auto overscroll-contain bg-[#f7f8f9] py-11 transition-[width] duration-300 dark:bg-[#1d1f21] lg:flex ${collapsed ? "w-[88px] px-4" : "w-[320px] px-9"}`}>
      <button onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden"><span><Icon name="chevron-right" size={16} /></span></button>
      <div className="hidden">
        {collapsed ? <span className="h-10 w-10 overflow-hidden"><Image src="/image_3-removebg-preview.png" alt="Kanvero" width={230} height={74} priority className="h-auto w-[160px] max-w-none" /></span> : <Image src="/image_3-removebg-preview.png" alt="Kanvero" width={230} height={74} priority className="h-auto w-[154px]" />}
      </div>
      <nav className="mt-8 space-y-1" aria-label="Primary navigation">
        <NavItem icon="grid" label="Boards" href="/dashboard" active={active === "Boards"} compact={collapsed} />
        <NavItem icon="tasks" label="Templates" href="/templates" active={active === "Templates"} compact={collapsed} />
        {active === "Templates" && !collapsed ? (
          <div className="ml-3 mt-1 space-y-0.5 border-l border-[#dcdfe4] pl-3 text-[13px] font-medium text-[#44546f] dark:border-[#3d4145] dark:text-[#b6c2cf]">
            {templateCategories.map((cat) => {
              const slug = catToSlug(cat);
              const isActive = activeSubSlug === slug;
              return (
                <Link
                  href={`/templates/${slug}`}
                  key={cat}
                  className={`flex h-8 w-full items-center rounded-md px-3 text-left transition ${
                    isActive
                      ? "bg-[#e9f2ff] text-[#0c66e4] font-semibold dark:bg-[#1c2b41] dark:text-[#579dff]"
                      : "hover:bg-[#e9ebf0] dark:hover:bg-[#282e33]"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        ) : null}
        <NavItem icon="home" label="Home" href="/home" active={active === "Home"} compact={collapsed} />
        <NavItem icon="calendar" label="Planner" href="/planner" active={active === "Planner"} compact={collapsed} />
        <NavItem icon="tasks" label="Inbox" href="/inbox" active={active === "Inbox"} compact={collapsed} />
      </nav>
      <div className="mt-3 border-t border-[#dcdfe4] pt-5 dark:border-[#3d4145]">
        {collapsed ? null : <p className="mb-3 px-3 text-xs font-semibold text-[#44546f] dark:text-[#b6c2cf]">Workspaces</p>}
        {workspaces.map((workspace) => {
          const isSelected = active === "Workspaces" && String(workspace.id) === String(selectedWorkspaceId);
          const isExpanded = workspaceExpansion?.id === String(workspace.id)
            ? workspaceExpansion.expanded
            : isSelected;
          return <div key={workspace.id}>
            <Link
              href={`/workspaces?workspaceId=${workspace.id}`}
              title={collapsed ? workspace.name : undefined}
              aria-expanded={isExpanded}
              onClick={(event) => {
                if (isSelected) event.preventDefault();
                setWorkspaceExpansion({ id: String(workspace.id), expanded: !isExpanded });
              }}
              className={`flex h-10 w-full items-center rounded-lg text-sm font-medium transition ${collapsed ? "justify-center" : "gap-3 px-3"} ${isSelected ? "bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]" : "text-[#172b4d] hover:bg-[#091e420f] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]"}`}
            >
              <Icon name="grid" size={18} />
              {collapsed ? null : <><span className="min-w-0 flex-1 truncate text-left">{workspace.name}</span><Icon name="chevron-right" size={15} className={`shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} /></>}
            </Link>
            {isExpanded && !collapsed ? <div className="ml-3 mt-1 space-y-1 border-l border-[#dcdfe4] pl-3 dark:border-[#3d4145]">
              <Link href={`/workspaces?workspaceId=${workspace.id}`} className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium ${isSelected && !membersActive ? "bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]" : "text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]"}`}><Icon name="grid" size={16} />Boards</Link>
              <Link href={`/workspaces/members?workspaceId=${workspace.id}`} className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm ${isSelected && membersActive ? "bg-[#e9f2ff] font-medium text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]" : "text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]"}`}><Icon name="tasks" size={16} />Members</Link>
              {workspace.canManage ? <button type="button" onClick={() => onSettings(workspace.id)} className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]"><Icon name="settings" size={16} />Settings</button> : null}
            </div> : null}
          </div>;
        })}
      </div>
    </aside>
  );
}

function MobileHeader({ onProfile, onSearch, userInitials }: { onProfile: () => void; onSearch: () => void; userInitials: string }) {
  return <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dedee8] bg-[#ffffff]/95 px-5 backdrop-blur dark:border-[#3d4145] dark:bg-[#1d1f21]/95 lg:hidden"><Image src="/image_3-removebg-preview.png" alt="Kanvero" width={230} height={74} priority className="h-auto w-[132px] dark:brightness-0 dark:invert" /><div className="flex items-center gap-3 text-[#4a4b59] dark:text-[#b6c2cf]"><button type="button" onClick={onSearch} aria-label="Search boards and cards" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#e9ebf0] dark:hover:bg-[#282e33]"><Icon name="search" size={21} /></button><button type="button" aria-label="Open profile menu" onClick={onProfile}><Avatar label={userInitials} /></button></div></header>;
}

function MobileNav({ active, onCreate, workspaceId, unreadNotifications }: { active: AppSection; onCreate: () => void; workspaceId?: string; unreadNotifications: number }) {
  const itemClass = (selected: boolean) => `flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-md py-2 text-[11px] ${selected ? "font-medium text-[#0c66e4] dark:text-[#579dff]" : "text-[#44546f] dark:text-[#b6c2cf]"}`;
  return <nav className="sticky bottom-0 z-20 mt-8 flex h-[76px] items-center gap-1 overflow-x-auto border-t border-[#e0e0e7] bg-white px-2 dark:border-[#3d4145] dark:bg-[#1d1f21] lg:hidden" aria-label="Mobile navigation">
    <Link href="/dashboard" className={itemClass(active === "Boards")}><Icon name="grid" size={20} />Boards</Link>
    <Link href="/home" className={itemClass(active === "Home")}><Icon name="home" size={20} />Home</Link>
    <Link href="/planner" className={itemClass(active === "Planner")}><Icon name="calendar" size={20} />Planner</Link>
    <Link href="/inbox" className={itemClass(active === "Inbox")}><Icon name="tasks" size={20} />Inbox</Link>
    <button type="button" onClick={onCreate} aria-label="Create board" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0c66e4] text-white shadow-md dark:bg-[#579dff] dark:text-[#1d2125]"><Icon name="plus" size={23} /></button>
    <Link href="/templates" className={itemClass(active === "Templates")}><Icon name="tasks" size={20} />Templates</Link>
    <Link href={workspaceId ? `/workspaces?workspaceId=${workspaceId}` : "/dashboard"} className={itemClass(active === "Workspaces")}><Icon name="grid" size={20} />Workspace</Link>
    <Link href="/notifications" aria-label={unreadNotifications ? `Alerts, ${unreadNotifications} unread` : "Alerts"} className={`${itemClass(active === "Notifications")} relative`}><span className="relative"><Icon name="bell" size={20} />{unreadNotifications ? <span className="absolute -right-2 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#c9372c] px-1 text-[9px] font-bold text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span> : null}</span>Alerts</Link>
  </nav>;
}

function BoardCard({ board, onRenamed, onRemoved, onError }: { board: DashboardBoard; onRenamed: (boardId: string, title: string) => void; onRemoved: (boardId: string) => void; onError: (message: string) => void }) {
  return (
    <div className="relative w-[242px] shrink-0">
    <Link href={`/boards/${board.slug}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-[#091e4224] bg-white shadow-sm transition hover:brightness-[0.97] dark:border-black/50 dark:bg-[#22272b] dark:hover:brightness-110">
      <div className="relative flex h-20 items-center justify-center bg-[#dfe1e6] text-[#626f86] dark:bg-[#2c333a] dark:text-[#b6c2cf]">
        {board.cover ? <Image src={board.cover} alt="" fill sizes="(max-width: 1024px) 238px, 32vw" className="object-cover" /> : <Icon name="grid" size={28} />}
        {board.cover ? <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" /> : null}
      </div>
      <div className="flex min-h-10 items-center bg-white px-3 py-2 text-[#172b4d] dark:bg-[#22272b] dark:text-[#f1f2f4]">
        <h3 className="truncate text-sm font-medium">{board.title}</h3>
      </div>
    </Link>
    {board.canManage ? <BoardActionsMenu boardId={board.id} title={board.title} onRenamed={(title) => onRenamed(board.id, title)} onRemoved={() => onRemoved(board.id)} onError={onError} /> : null}
    </div>
  );
}

function TemplateCard({ template }: { template: (typeof templates)[number] }) {
  return (
    <Link href="/templates" className="min-w-[220px] flex-1 overflow-hidden rounded-lg border border-[#dcdfe4] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-black/50 dark:bg-[#22272b]">
      <div className="flex h-24 items-center justify-between bg-gradient-to-br from-[#e9f2ff] to-[#d8f0ff] p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0c66e4] text-white">
          <Icon name={template.icon} size={19} />
        </span>
        <div className="grid w-24 gap-1">
          <span className="h-2 rounded bg-[#8b7bea]" />
          <span className="h-2 w-4/5 rounded bg-[#a8c7f1]" />
          <span className="h-2 w-3/5 rounded bg-[#b6a8f4]" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{template.title}</h3>
        <p className="mt-1 text-xs text-[#44546f] dark:text-[#b6c2cf]">{template.caption}</p>
      </div>
    </Link>
  );
}

function BoardHub({ allBoards, workspaces, workspaceError, onCreate, onSettings, onCategory, onBoardRenamed, onBoardRemoved, onError }: { allBoards: DashboardBoard[]; workspaces: DashboardWorkspace[]; workspaceError: string | null; onCreate: (workspaceId?: string) => void; onSettings: (workspaceId: string) => void; onCategory: (slug: string) => void; onBoardRenamed: (boardId: string, title: string) => void; onBoardRemoved: (boardId: string) => void; onError: (message: string) => void }) {
  return (
    <div className="mx-auto max-w-[1360px] pb-6">
      
      {/* Most Popular Templates */}
      <section className="mt-2 mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#dcdfe4] pb-4 dark:border-[#3d4145]">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#172b4d] dark:text-[#f1f2f4]">Most popular templates</h1>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3 text-[15px] text-[#44546f] dark:text-[#b6c2cf]">
              <span>Get going faster with a template from the Trello community or</span>
              <select defaultValue="" onChange={(event) => { if (event.target.value) onCategory(event.target.value); }} className="rounded-md border border-[#8590a2] bg-white px-3 py-2 text-sm focus:border-[#0c66e4] focus:outline-none dark:border-[#626f86] dark:bg-[#22272b] dark:text-[#b6c2cf]">
                <option value="">choose a category</option>
                <option value="business">Business</option>
                <option value="design">Design</option>
              </select>
            </div>
          </div>
          <Link href="/templates" className="mt-4 sm:mt-0 text-sm font-medium text-[#0c66e4] hover:underline">
            Browse the full template gallery
          </Link>
        </div>
        <div className="mt-5 flex gap-4 overflow-x-auto pb-2 lg:overflow-visible">
          {templates.map((template) => <TemplateCard key={template.title} template={template} />)}
        </div>
      </section>

      {/* Recently Viewed */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Recently viewed</h2>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 lg:max-w-[610px]">
          {allBoards.slice(0, 2).map((board) => <BoardCard key={board.slug} board={board} onRenamed={onBoardRenamed} onRemoved={onBoardRemoved} onError={onError} />)}
        </div>
      </section>

      {/* YOUR WORKSPACES Section */}
      <section className="mt-12">
        <div className="mb-2 flex items-center justify-between">
          <p className="px-1 text-[15px] font-semibold uppercase tracking-wide text-[#44546f] dark:text-[#b6c2cf]">YOUR WORKSPACES</p>
        </div>
        {workspaceError ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{workspaceError}</p> : null}
        {!workspaceError && workspaces.length === 0 ? <div className="rounded-lg border border-[#dcdfe4] bg-white p-5 dark:border-[#454f59] dark:bg-[#22272b]"><p className="text-sm text-[#44546f] dark:text-[#b6c2cf]">Your personal workspace is being prepared. Refresh the page if it does not appear shortly.</p></div> : null}
        <div className="space-y-10">
          {workspaces.map((workspace) => <div key={workspace.id}>
            <div className="flex flex-col gap-4 border-b border-[#dcdfe4] pb-4 dark:border-[#3d4145] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffb37c] text-sm font-bold text-[#5b2707]">{workspace.name.charAt(0).toUpperCase()}</span>
                <h2 className="text-xl font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{workspace.name}</h2>
              </div>
              <div className="flex gap-2">
                <Link href={`/workspaces?workspaceId=${workspace.id}`} className="flex items-center gap-1.5 rounded-md bg-[#091e420f] px-3 py-2 text-sm font-medium text-[#172b4d] transition hover:bg-[#091e4214] dark:bg-[#282e33] dark:text-[#f1f2f4] dark:hover:bg-[#323940]">Boards</Link>
                <Link href={`/workspaces/members?workspaceId=${workspace.id}`} className="flex items-center gap-1.5 rounded-md bg-[#091e420f] px-3 py-2 text-sm text-[#172b4d] transition hover:bg-[#091e4214] dark:bg-[#282e33] dark:text-[#f1f2f4] dark:hover:bg-[#323940]">Members</Link>
                {workspace.canManage ? <button type="button" onClick={() => onSettings(workspace.id)} className="flex items-center gap-1.5 rounded-md bg-[#091e420f] px-3 py-2 text-sm text-[#172b4d] transition hover:bg-[#091e4214] dark:bg-[#282e33] dark:text-[#f1f2f4] dark:hover:bg-[#323940]">Settings</button> : null}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-4">
              {workspace.boards.map((board) => <BoardCard key={board.id} board={board} onRenamed={onBoardRenamed} onRemoved={onBoardRemoved} onError={onError} />)}
              <button type="button" onClick={() => onCreate(workspace.id)} className="flex h-[120px] w-[242px] shrink-0 items-center justify-center rounded-lg border border-[#091e4224] bg-[#091e420f] text-sm font-medium text-[#44546f] transition hover:bg-[#091e4214] dark:border-black/50 dark:bg-[#282e33] dark:text-[#b6c2cf] dark:hover:bg-[#323940]">Create new board</button>
            </div>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function DashboardShell({ active = "Boards", children, workspaceId: workspaceIdProp }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [workspaces, setWorkspaces] = useState<DashboardWorkspace[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [allBoards, setAllBoards] = useState<DashboardBoard[]>([]);
  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState<{ boards: GlobalSearchBoard[]; cards: GlobalSearchCard[] }>({ boards: [], cards: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardCover, setNewBoardCover] = useState<string | null>(DEFAULT_BOARD_COVER);
  const [newBoardWorkspaceId, setNewBoardWorkspaceId] = useState("");
  const [newBoardVisibility, setNewBoardVisibility] = useState<"private" | "workspace" | "public">("workspace");
  const [newBoardTemplateKey, setNewBoardTemplateKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsWorkspaceId, setSettingsWorkspaceId] = useState<string | null>(null);
  const [workspacePrivate, setWorkspacePrivate] = useState(true);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(workspaceIdProp ?? null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      try {
        const [data, userData, notificationData] = await Promise.all([apiGet<WorkspacesResponse>("/workspaces"), apiGet<{ user: CurrentUser }>("/auth/me"), apiGet<{ notifications: Array<{ id: string }> }>("/notifications?unread=true&limit=100")]);
        const loadedWorkspaces = await Promise.all(data.workspaces.map(async (workspace) => {
          const boardData = await apiGet<BoardsResponse>(`/boards?workspaceId=${workspace.id}`);
          const workspaceBoards = boardData.boards.map((board): DashboardBoard => ({
            id: board.id,
            workspaceId: workspace.id,
            title: board.title,
            slug: board.slug,
            cover: board.coverUrl,
            members: board.members.map((member) => member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()),
            canManage: String(workspace.ownerId) === String(userData.user.id) || String(board.ownerId) === String(userData.user.id) || ["owner", "admin"].includes(board.members.find((member) => String(member.id) === String(userData.user.id))?.BoardMember?.role ?? ""),
          }));
          const currentMembership = workspace.members?.find((member) => String(member.id) === String(userData.user.id));
          const canManage = String(workspace.ownerId) === String(userData.user.id) || ["owner", "admin"].includes(currentMembership?.WorkspaceMember?.role ?? "");
          return { ...workspace, boards: workspaceBoards, canManage };
        }));

        if (cancelled) return;
        setWorkspaces(loadedWorkspaces);
        setCurrentUser(userData.user);
        setAllBoards(loadedWorkspaces.flatMap((workspace) => workspace.boards));
        setUnreadNotifications(notificationData.notifications.length);
        setWorkspaceError(null);
      } catch (error) {
        if (!cancelled) {
          setWorkspaceError(error instanceof Error ? error.message : "Failed to load workspaces");
        }
      }
    }

    loadWorkspaces();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleNotificationsRead(event: Event) {
      const count = (event as CustomEvent<number>).detail || 0;
      setUnreadNotifications((current) => Math.max(0, current - count));
    }
    window.addEventListener("notifications-read", handleNotificationsRead);
    return () => window.removeEventListener("notifications-read", handleNotificationsRead);
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      apiGet<{ boards: GlobalSearchBoard[]; cards: GlobalSearchCard[] }>(`/search?q=${encodeURIComponent(query)}`)
        .then((results) => { if (!cancelled) setGlobalSearch(results); })
        .catch(() => { if (!cancelled) setGlobalSearch({ boards: [], cards: [] }); })
        .finally(() => { if (!cancelled) setSearchLoading(false); });
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      setSelectedWorkspaceId(workspaceIdProp ?? new URLSearchParams(window.location.search).get("workspaceId"));
      if (new URLSearchParams(window.location.search).get("create") === "1") {
        const params = new URLSearchParams(window.location.search);
        setNewBoardTitle(params.get("title") ?? "");
        setNewBoardCover(params.get("cover") ?? DEFAULT_BOARD_COVER);
        setNewBoardWorkspaceId(params.get("workspaceId") ?? "");
        setNewBoardTemplateKey(params.get("template"));
        setCreateOpen(true);
        window.history.replaceState({}, "", pathname);
      }
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, [pathname, workspaceIdProp]);

  function preferredWorkspaceId() {
    const ownedWorkspace = workspaces.find((workspace) => String(workspace.ownerId) === String(currentUser?.id));
    return ownedWorkspace?.id ?? workspaces[0]?.id ?? "";
  }

  function setTheme(theme: "light" | "dark" | "system") {
    localStorage.setItem("kanvero_theme", theme);
    const dark = theme === "dark" || theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", theme === "light");
  }

  async function createBoard() {
    const title = newBoardTitle.trim();
    const workspaceId = newBoardWorkspaceId || preferredWorkspaceId();
    if (!title || !workspaceId) return;
    try {
      const data = await apiPost<{ board: ApiBoard }>("/boards", { workspaceId, title, coverUrl: newBoardCover, visibility: newBoardVisibility, ...(newBoardTemplateKey ? { templateKey: newBoardTemplateKey } : {}) });
      const nextBoard: DashboardBoard = {
        id: data.board.id,
        workspaceId,
        title: data.board.title,
        slug: data.board.slug,
        cover: data.board.coverUrl,
        members: [],
        canManage: true,
      };
      setAllBoards((current) => [...current, nextBoard]);
      setWorkspaces((current) => current.map((workspace) => workspace.id === workspaceId ? { ...workspace, boards: [...workspace.boards, nextBoard] } : workspace));
      setCreateOpen(false);
      setNewBoardTitle("");
      setNewBoardCover(DEFAULT_BOARD_COVER);
      setNewBoardWorkspaceId("");
      setNewBoardVisibility("workspace");
      setNewBoardTemplateKey(null);
      router.push(`/boards/${data.board.slug}`);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to create board");
    }
  }

  function logout() {
    localStorage.removeItem("kanvero_token");
    localStorage.removeItem("kanvero_user");
    window.location.replace("/login");
  }

  function openWorkspaceSettings(workspaceId?: string) {
    const selectedId = workspaceId ?? new URLSearchParams(window.location.search).get("workspaceId");
    const workspace = workspaces.find((item) => item.id === selectedId);
    if (!workspace) {
      setWorkspaceError("Select a workspace before opening settings.");
      return;
    }
    if (!workspace.canManage) {
      setWorkspaceError("Only a workspace owner or admin can change workspace settings.");
      return;
    }
    setSettingsWorkspaceId(workspace.id);
    setWorkspacePrivate(workspace.isPrivate);
    setSettingsOpen(true);
  }

  async function saveWorkspaceSettings() {
    if (!settingsWorkspaceId) return;
    try {
      await apiPatch(`/workspaces/${settingsWorkspaceId}`, { isPrivate: workspacePrivate });
      setWorkspaces((current) => current.map((workspace) => workspace.id === settingsWorkspaceId ? { ...workspace, isPrivate: workspacePrivate } : workspace));
      setSettingsOpen(false);
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to save workspace settings");
    }
  }

  function openCreateBoard(workspaceId = "") {
    if (!workspaces.length) {
      setWorkspaceError("Your personal workspace is not available yet. Please refresh the page.");
      return;
    }
    setNewBoardWorkspaceId(workspaceId || preferredWorkspaceId());
    setNewBoardCover(DEFAULT_BOARD_COVER);
    setNewBoardTemplateKey(null);
    setNewBoardVisibility("workspace");
    setCreateOpen(true);
  }

  function renameBoardInState(boardId: string, title: string) {
    setAllBoards((current) => current.map((board) => board.id === boardId ? { ...board, title } : board));
    setWorkspaces((current) => current.map((workspace) => ({ ...workspace, boards: workspace.boards.map((board) => board.id === boardId ? { ...board, title } : board) })));
    setWorkspaceError(null);
  }

  function removeBoardFromState(boardId: string) {
    setAllBoards((current) => current.filter((board) => board.id !== boardId));
    setWorkspaces((current) => current.map((workspace) => ({ ...workspace, boards: workspace.boards.filter((board) => board.id !== boardId) })));
    setWorkspaceError(null);
  }

  const userInitials = currentUser?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";

  // Auto-detect the active sub-slug from the URL (for example, /templates/business).
  const activeSubSlug = active === "Templates" && pathname.startsWith("/templates/")
    ? pathname.split("/")[2] ?? null
    : null;

  return (
    <div className="min-h-screen bg-white text-[#172b4d] dark:bg-[#1d1f21] dark:text-[#b6c2cf]">
      <Sidebar active={active} collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} activeSubSlug={activeSubSlug} onSettings={openWorkspaceSettings} membersActive={pathname === "/workspaces/members"} workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} />
      <MobileHeader onProfile={() => { setMobileSearchOpen(false); setProfileOpen((open) => !open); }} onSearch={() => { setProfileOpen(false); setMobileSearchOpen((open) => !open); }} userInitials={userInitials} />
      {profileOpen ? <div className="fixed right-4 top-[68px] z-50 w-60 rounded-lg border border-[#dcdfe4] bg-white p-2 text-sm shadow-xl dark:border-[#454f59] dark:bg-[#282e33] lg:hidden"><p className="px-3 py-2 font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{currentUser?.name ?? "User"}</p><Link href="/settings" onClick={() => setProfileOpen(false)} className="mb-2 block rounded-md px-3 py-2 text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">Account settings</Link><p className="px-3 pb-1 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Theme</p><div className="grid grid-cols-3 gap-1 px-2 pb-2">{(["light", "dark", "system"] as const).map((theme) => <button key={theme} type="button" onClick={() => setTheme(theme)} className="rounded-md border border-[#dcdfe4] px-2 py-1.5 text-xs capitalize text-[#44546f] hover:bg-[#e9ebf0] dark:border-[#454f59] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">{theme}</button>)}</div><button type="button" onClick={logout} className="w-full rounded-md px-3 py-2 text-left text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">Log out</button></div> : null}
      {mobileSearchOpen ? <section className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-white p-4 dark:bg-[#1d1f21] lg:hidden" aria-label="Search boards and cards"><div className="relative"><Icon name="search" size={19} className="absolute left-3 top-3 text-[#626f86]" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search boards and cards" className="h-11 w-full rounded-lg border border-[#b7bec8] bg-white pl-10 pr-11 text-sm text-[#172b4d] outline-none focus:border-[#0c66e4] dark:border-[#626f86] dark:bg-[#22272b] dark:text-[#f1f2f4]" /><button type="button" aria-label="Close search" onClick={() => { setMobileSearchOpen(false); setSearch(""); }} className="absolute right-2 top-1.5 flex h-8 w-8 items-center justify-center rounded-md text-[#626f86] hover:bg-[#e9ebf0] dark:hover:bg-[#282e33]"><Icon name="x" size={17} /></button></div>{search.trim() ? <div className="mt-4 space-y-4">{searchLoading ? <p className="p-3 text-sm text-[#626f86] dark:text-[#9fadbc]">Searching…</p> : <>{globalSearch.boards.length ? <section><h3 className="px-2 py-1 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Boards</h3>{globalSearch.boards.map((board) => <Link key={board.slug} href={`/boards/${board.slug}`} onClick={() => { setMobileSearchOpen(false); setSearch(""); }} className="flex items-center gap-3 rounded-md p-3 text-sm font-medium text-[#172b4d] hover:bg-[#e9ebf0] dark:text-[#f1f2f4] dark:hover:bg-[#282e33]"><span className="relative flex h-10 w-14 items-center justify-center overflow-hidden rounded bg-[#ececf2] dark:bg-[#3b444c]">{board.coverUrl ? <Image src={board.coverUrl} alt="" fill sizes="56px" className="object-cover" /> : <Icon name="grid" size={16} />}</span>{board.title}</Link>)}</section> : null}{globalSearch.cards.length ? <section><h3 className="px-2 py-1 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Cards</h3>{globalSearch.cards.map((card) => <Link key={card.id} href={`/boards/${card.list.board.slug}?card=${card.id}`} onClick={() => { setMobileSearchOpen(false); setSearch(""); }} className="flex items-start gap-3 rounded-md p-3 text-sm text-[#172b4d] hover:bg-[#e9ebf0] dark:text-[#f1f2f4] dark:hover:bg-[#282e33]"><Icon name="tasks" size={17} className="mt-0.5 shrink-0" /><span><span className="block font-medium">{card.title}</span><span className="block text-xs text-[#626f86] dark:text-[#9fadbc]">{card.list.board.title} · {card.list.title}</span></span></Link>)}</section> : null}{!globalSearch.boards.length && !globalSearch.cards.length ? <p className="p-3 text-sm text-[#626f86] dark:text-[#9fadbc]">No boards or cards found</p> : null}</>}</div> : <p className="p-5 text-center text-sm text-[#626f86] dark:text-[#9fadbc]">Start typing to search across your work.</p>}</section> : null}
      <div className="min-w-0 lg:pl-[320px] lg:pt-[52px]">
        <header className="fixed inset-x-0 top-0 z-40 hidden h-[52px] items-center border-b border-[#dcdfe4] bg-white px-4 dark:border-[#3d4145] dark:bg-[#1d1f21] lg:flex">
          <div className="mr-4 flex items-center gap-3">
            <span className="grid grid-cols-3 gap-[3px] text-[#44546f] dark:text-[#b6c2cf]" aria-hidden="true">{Array.from({ length: 9 }).map((_, index) => <span key={index} className="h-[3px] w-[3px] rounded-full bg-current" />)}</span>
            <Image src="/image_3-removebg-preview.png" alt="Kanvero" width={230} height={74} priority className="h-auto w-[106px] dark:brightness-0 dark:invert" />
          </div>
          <div className="relative mx-auto flex h-9 w-[min(52vw,860px)] items-center">
            <Icon name="search" size={20} className="absolute left-3 text-[#44546f]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search" className="h-full w-full rounded-lg border border-[#b7bec8] bg-white pl-10 pr-4 text-sm text-[#172b4d] transition focus:border-[#0c66e4] focus:outline-none focus:ring-1 focus:ring-[#0c66e4] dark:border-[#626f86] dark:bg-[#22272b] dark:text-[#f1f2f4]" />
            {search.trim() ? <div className="absolute left-0 top-11 z-40 max-h-[min(520px,70vh)] w-full overflow-y-auto rounded-lg border border-[#dcdfe4] bg-white p-2 shadow-xl dark:border-[#454f59] dark:bg-[#282e33]">{searchLoading ? <p className="p-3 text-sm text-[#626f86] dark:text-[#9fadbc]">Searching…</p> : <>{globalSearch.boards.length ? <section><h3 className="px-2 py-1 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Boards</h3>{globalSearch.boards.map((board) => <Link key={board.slug} href={`/boards/${board.slug}`} onClick={() => setSearch("")} className="flex items-center gap-3 rounded-md p-2 text-sm font-medium text-[#172b4d] hover:bg-[#e9ebf0] dark:text-[#f1f2f4] dark:hover:bg-[#3b444c]"><span className="relative flex h-9 w-12 items-center justify-center overflow-hidden rounded bg-[#ececf2] text-[#626f86] dark:bg-[#3b444c]">{board.coverUrl ? <Image src={board.coverUrl} alt="" fill sizes="48px" className="object-cover" /> : <Icon name="grid" size={16} />}</span>{board.title}</Link>)}</section> : null}{globalSearch.cards.length ? <section className={globalSearch.boards.length ? "mt-2 border-t border-[#dcdfe4] pt-2 dark:border-[#454f59]" : ""}><h3 className="px-2 py-1 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Cards</h3>{globalSearch.cards.map((card) => <Link key={card.id} href={`/boards/${card.list.board.slug}?card=${card.id}`} onClick={() => setSearch("")} className="flex items-start gap-3 rounded-md p-2 text-sm text-[#172b4d] hover:bg-[#e9ebf0] dark:text-[#f1f2f4] dark:hover:bg-[#3b444c]"><Icon name="tasks" size={17} className="mt-0.5 shrink-0" /><span><span className="block font-medium">{card.title}</span><span className="block text-xs text-[#626f86] dark:text-[#9fadbc]">{card.list.board.title} · {card.list.title}</span></span></Link>)}</section> : null}{!globalSearch.boards.length && !globalSearch.cards.length ? <p className="p-3 text-sm text-[#626f86] dark:text-[#9fadbc]">No boards or cards found</p> : null}</>}</div> : null}
          </div>
          <button type="button" onClick={() => openCreateBoard()} className="ml-2 h-9 rounded-lg bg-[#0c66e4] px-4 text-sm font-semibold text-white transition hover:bg-[#0055cc] dark:bg-[#579dff] dark:text-[#1d2125] dark:hover:bg-[#85b8ff]">Create</button>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/notifications" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#44546f] transition hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]">
              <Icon name="bell" size={20} />
              {unreadNotifications ? <span className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#c9372c] px-1 text-[9px] font-bold text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span> : null}
            </Link>
            <button type="button" aria-label="Help" onClick={() => setHelpOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#44546f] transition hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]">
              <Icon name="help" size={21} />
            </button>
            <button type="button" aria-label="Open profile menu" onClick={() => setProfileOpen((open) => !open)} className="relative ml-2 transition hover:opacity-80">
              <Avatar label={userInitials} />
            </button>
            {profileOpen ? <div className="absolute right-10 top-14 z-40 w-56 rounded-lg border border-[#dcdfe4] bg-white p-2 text-sm shadow-xl dark:border-[#454f59] dark:bg-[#282e33]"><p className="px-3 py-2 font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{currentUser?.name ?? "User"}</p><Link href="/settings" onClick={() => setProfileOpen(false)} className="mb-2 block rounded-md px-3 py-2 text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">Account settings</Link><p className="px-3 pb-1 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Theme</p><div className="grid grid-cols-3 gap-1 px-2 pb-2">{(["light", "dark", "system"] as const).map((theme) => <button key={theme} type="button" onClick={() => setTheme(theme)} className="rounded-md border border-[#dcdfe4] px-2 py-1.5 text-xs capitalize text-[#44546f] hover:bg-[#e9ebf0] dark:border-[#454f59] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">{theme}</button>)}</div><button type="button" onClick={logout} className="w-full rounded-md px-3 py-2 text-left text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">Log out</button></div> : null}
          </div>
        </header>
        <main className="w-full px-5 py-7 pb-0 sm:px-10 lg:px-12 lg:py-11 animate-page">
          {children ?? <BoardHub allBoards={allBoards} workspaces={workspaces} workspaceError={workspaceError} onCreate={openCreateBoard} onSettings={openWorkspaceSettings} onCategory={(slug) => router.push(`/templates/${slug}`)} onBoardRenamed={renameBoardInState} onBoardRemoved={removeBoardFromState} onError={setWorkspaceError} />}
        </main>
        <MobileNav active={active} onCreate={() => openCreateBoard()} workspaceId={selectedWorkspaceId ?? workspaces[0]?.id} unreadNotifications={unreadNotifications} />
      </div>

      {createOpen ? <CreateBoardDialog title={newBoardTitle} cover={newBoardCover} workspaceId={newBoardWorkspaceId || preferredWorkspaceId()} visibility={newBoardVisibility} fromTemplate={Boolean(newBoardTemplateKey)} workspaces={workspaces} error={workspaceError} onTitleChange={setNewBoardTitle} onCoverChange={setNewBoardCover} onWorkspaceChange={setNewBoardWorkspaceId} onVisibilityChange={setNewBoardVisibility} onCreate={createBoard} onClose={() => setCreateOpen(false)} onStartTemplate={() => { setCreateOpen(false); router.push("/templates"); }} /> : null}
      {helpOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172b4d]/35 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="app-help-title" className="w-full max-w-md rounded-xl bg-white p-5 text-[#172b4d] shadow-2xl dark:bg-[#282e33] dark:text-[#f1f2f4]"><div className="flex items-center justify-between"><h2 id="app-help-title" className="text-lg font-semibold">Kanvero help</h2><button type="button" aria-label="Close" onClick={() => setHelpOpen(false)}><Icon name="x" size={18} /></button></div><p className="mt-4 text-sm leading-6 text-[#44546f] dark:text-[#b6c2cf]">Use Boards to organize cards, Templates to start from a workflow, and Workspaces to manage collaborators.</p></section></div> : null}
      {settingsOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172b4d]/35 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="workspace-settings-title" className="w-full max-w-sm rounded-xl bg-white p-5 text-[#172b4d] shadow-2xl dark:bg-[#282e33] dark:text-[#f1f2f4]"><div className="flex items-center justify-between"><h2 id="workspace-settings-title" className="text-lg font-semibold">Workspace settings</h2><button type="button" aria-label="Close" onClick={() => setSettingsOpen(false)}><Icon name="x" size={18} /></button></div><label className="mt-5 flex items-center justify-between gap-4 text-sm text-[#44546f] dark:text-[#b6c2cf]"><span><span className="block font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Private workspace</span><span className="mt-1 block text-xs">Only invited members can access it.</span></span><input type="checkbox" checked={workspacePrivate} onChange={(event) => setWorkspacePrivate(event.target.checked)} className="h-5 w-5 accent-[#0c66e4]" /></label><button type="button" onClick={saveWorkspaceSettings} className="mt-6 h-10 w-full rounded-lg bg-[#0c66e4] text-sm font-semibold text-white dark:bg-[#579dff] dark:text-[#1d2125]">Save settings</button></section></div> : null}
      {profileOpen ? <div className="fixed inset-0 z-30 lg:hidden" onPointerDown={() => setProfileOpen(false)}><div className="absolute right-4 top-16 w-56 rounded-lg border border-[#dcdfe4] bg-white p-2 text-sm shadow-xl dark:border-[#454f59] dark:bg-[#282e33]" onPointerDown={(event) => event.stopPropagation()}><p className="px-3 py-2 font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{currentUser?.name ?? "User"}</p><Link href="/settings" onClick={() => setProfileOpen(false)} className="mb-2 block rounded-md px-3 py-2 text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">Account settings</Link><p className="px-3 pb-1 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Theme</p><div className="grid grid-cols-3 gap-1 px-2 pb-2">{(["light", "dark", "system"] as const).map((theme) => <button key={theme} type="button" onClick={() => setTheme(theme)} className="rounded-md border border-[#dcdfe4] px-2 py-1.5 text-xs capitalize text-[#44546f] dark:border-[#454f59] dark:text-[#b6c2cf]">{theme}</button>)}</div><button type="button" onClick={logout} className="w-full rounded-md px-3 py-2 text-left text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]">Log out</button></div></div> : null}
    </div>
  );
}

