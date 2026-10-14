"use client";

import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Copy,
  ImageIcon,
  Lightbulb,
  ListFilter,
  ListChecks,
  Link2,
  MoveRight,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  Search,
  Star,
  SlidersHorizontal,
  Tag,
  Table2,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../lib/api-client";
import { Icon } from "../dashboard/dashboard-icon";
import { useDialogFocus } from "../use-dialog-focus";
import { BoardShareDialog, type ShareMember } from "./board-share-dialog";

type BoardViewProps = {
  boardSlug: string;
};

type BoardSummary = { id: string; workspaceId: string; title: string; workspace: string; description?: string; visibility?: "private" | "workspace" | "public"; cover?: string };

type ApiUser = { id: string; name: string; email: string };
type ApiBoardMember = ApiUser & { BoardMember?: { role: string } };
type ApiLabel = { id: string; name: string; color: string };
type ApiComment = { id: string; text: string; createdAt: string; author?: ApiUser };
type ChecklistItem = { id: string; title: string; completed: boolean; dueDate?: string; assigneeId?: string };
type CardChecklist = { id: string; title: string; items: ChecklistItem[] };
type ApiCard = { id: string; creatorId: string; title: string; description: string | null; completed: boolean; updatedAt: string; coverUrl: string | null; coverColor: string | null; coverSize: "header" | "full"; startDate: string | null; dueDate: string | null; dueTime: string | null; recurring: string | null; reminder: string | null; labels: ApiLabel[]; members: ApiUser[]; comments: ApiComment[]; attachments: Array<{ id: string; name: string; url: string }>; customFields: Array<{ id: string; name: string; value: string }>; checklists: Array<{ id: string; title: string; items: Array<{ id: string; title: string; completed: boolean; dueDate: string | null; assigneeId: string | null }> }> };
type ApiList = { id: string; title: string; cards: ApiCard[] };
type ApiBoard = { id: string; workspaceId: string; ownerId: string; title: string; description: string | null; visibility: "private" | "workspace" | "public"; slug: string; coverUrl: string | null; starred: boolean; workspace?: { id: string; name: string }; labels: ApiLabel[]; members: ApiBoardMember[]; lists: ApiList[] };
type BoardPermissions = { canEdit: boolean; canAdmin: boolean };
type BoardActivityItem = { id: string; type: string; message: string; createdAt: string; actor?: ApiUser };
type ArchivedBoardItem = { id: string; title: string };
type BoardAutomationItem = { id: string; name: string; triggerType: "card_created" | "card_moved"; triggerListId: string | null; actionType: "mark_complete" | "move_to_list"; actionListId: string | null; enabled: boolean };
type ApiBoardSummary = Pick<ApiBoard, "id" | "workspaceId" | "title" | "slug" | "coverUrl">;
type ApiWorkspace = { id: string; ownerId: string; name: string; members?: ApiUser[] };

type BoardCardData = {
  id: string;
  creatorId?: string;
  title: string;
  label: string;
  color: string;
  labelIds?: string[];
  completed?: boolean;
  aged?: boolean;
  memberIds?: string[];
  cover?: string;
  coverColor?: string;
  coverSize?: "header" | "full";
  startDate?: string;
  dueDate?: string;
  dueTime?: string;
  recurring?: string;
  reminder?: string;
  description?: string;
  comments?: Array<{ id: string; text: string; author: string; createdAt: string }>;
  attachments?: Array<{ id: string; name: string; url: string }>;
  customFields?: Array<{ id: string; name: string; value: string }>;
  checklists?: CardChecklist[];
};

type CardCoverUpdate = Pick<BoardCardData, "cover" | "coverColor" | "coverSize">;
type CardDateUpdate = Pick<BoardCardData, "startDate" | "dueDate" | "dueTime" | "recurring" | "reminder">;

function useViewportClampedTop(panelRef: RefObject<HTMLElement | null>, requestedTop: number, margin = 16) {
  const [top, setTop] = useState(() => Math.max(margin, requestedTop));

  useEffect(() => {
    function updateTop() {
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
      const nextTop = Math.max(margin, Math.min(requestedTop, window.innerHeight - panelHeight - margin));
      setTop((current) => Math.abs(current - nextTop) < 1 ? current : nextTop);
    }

    updateTop();
    const observer = new ResizeObserver(updateTop);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener("resize", updateTop);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTop);
    };
  }, [margin, panelRef, requestedTop]);

  return top;
}

type MenuPosition = {
  left: number;
  top: number;
};

type BoardListData = {
  id: string;
  title: string;
  cards: BoardCardData[];
};

type BoardLabel = {
  id: string;
  name: string;
  color: string;
};

function mapApiCard(card: ApiCard): BoardCardData {
  const primaryLabel = card.labels[0];
  return {
    id: String(card.id),
    creatorId: String(card.creatorId),
    title: card.title,
    label: primaryLabel?.name || "No labels",
    color: primaryLabel?.color || "#a0a1aa",
    labelIds: card.labels.map((label) => String(label.id)),
    completed: card.completed,
    aged: new Date(card.updatedAt).getTime() < Date.now() - 7 * 86400000,
    memberIds: card.members.map((member) => String(member.id)),
    cover: card.coverUrl ?? undefined,
    coverColor: card.coverColor ?? undefined,
    coverSize: card.coverSize,
    startDate: card.startDate ?? undefined,
    dueDate: card.dueDate ?? undefined,
    dueTime: card.dueTime?.slice(0, 5) ?? undefined,
    recurring: card.recurring ?? undefined,
    reminder: card.reminder ?? undefined,
    description: card.description ?? undefined,
    comments: card.comments.map((comment) => ({ id: String(comment.id), text: comment.text, author: comment.author?.name ?? "Unknown user", createdAt: new Date(comment.createdAt).toLocaleString() })),
    attachments: card.attachments.map((attachment) => ({ id: String(attachment.id), name: attachment.name, url: attachment.url })),
    customFields: card.customFields.map((field) => ({ id: String(field.id), name: field.name, value: field.value })),
    checklists: (card.checklists ?? []).map((checklist) => ({ id: String(checklist.id), title: checklist.title, items: checklist.items.map((item) => ({ id: String(item.id), title: item.title, completed: item.completed, dueDate: item.dueDate ?? undefined, assigneeId: item.assigneeId ? String(item.assigneeId) : undefined })) })),
  };
}

type BoardMember = ShareMember & { role?: string };
const BoardMembersContext = createContext<BoardMember[]>([]);

const cardCoverOptions = [
  { name: "Project planning", src: "/cat-project-management.jpg" },
  { name: "Business", src: "/cat-business.jpg" },
  { name: "Engineering", src: "/cat-engineering.jpg" },
  { name: "Design", src: "/cat-design.jpg" },
  { name: "Marketing", src: "/cat-marketing.jpg" },
  { name: "Education", src: "/cat-education.jpg" },
];

const cardCoverColors = [
  "#2f9c73", "#c89a00", "#d97706", "#d04437", "#8f4bb3",
  "#2875d1", "#2c88a3", "#5d8f1f", "#b04a86", "#74777d",
];

function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#ffbd8a] text-[10px] font-bold text-[#44220d] shadow-sm">
      {label}
    </span>
  );
}

function CardContent({ id, title, labelIds, completed = false, aged = false, memberIds = [], cover, coverColor, coverSize = "header", dueDate, checklists = [], labels, onToggleComplete, onQuickEdit }: BoardCardData & { labels: BoardLabel[]; onToggleComplete?: (cardId: string) => void; onQuickEdit?: (cardId: string, position: MenuPosition) => void }) {
  const boardMembers = useContext(BoardMembersContext);
  const fullCover = coverSize === "full" && Boolean(cover || coverColor);
  const [coverDimensions, setCoverDimensions] = useState<{ source: string; aspectRatio: number } | null>(null);
  const coverAspectRatio = coverDimensions && coverDimensions.source === cover ? coverDimensions.aspectRatio : null;
  const selectedLabels = labels.filter((item) => labelIds?.includes(item.id));
  const checklistItems = checklists.flatMap((checklist) => checklist.items);
  const completedChecklistItems = checklistItems.filter((item) => item.completed).length;

  return (
    <div data-aged={aged || undefined} className={`group relative overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_1px_2px_rgba(24,25,31,0.18)] transition hover:border-[#1d7afc] hover:shadow-md dark:border-[#454f59] dark:bg-[#22272b] ${fullCover ? "min-h-45" : ""}`}>
      {onQuickEdit ? (
        <button
          type="button"
          aria-label={`Quick edit ${title}`}
          title="Quick edit"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            const cardElement = event.currentTarget.closest("article");
            const rect = cardElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
            onQuickEdit(id, {
              left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - 184)),
              top: Math.max(8, Math.min(rect.top, window.innerHeight - 420)),
            });
          }}
          className="absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center rounded-md bg-[#e9ebf0] text-[#5d5e6b] opacity-0 shadow-sm transition hover:bg-[#e3e1f3] hover:text-[#0c66e4] focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Pencil size={15} strokeWidth={1.9} />
        </button>
      ) : null}
      {cover || coverColor ? (
        <div
          className={fullCover ? "absolute inset-0 z-0 overflow-hidden" : `relative w-full overflow-hidden border-b border-black/10 bg-white ${cover ? "max-h-70" : "h-24"}`}
          style={{
            ...(coverColor ? { backgroundColor: coverColor } : {}),
            ...(!fullCover && cover ? { aspectRatio: coverAspectRatio ?? "16 / 10" } : {}),
          }}
        >
          {cover ? (
            <div className={fullCover ? "absolute inset-0" : "absolute -inset-px"}>
              <Image
                src={cover}
                alt=""
                fill
                sizes="260px"
                unoptimized={cover.startsWith("data:") || cover.startsWith("blob:")}
                className={fullCover ? "object-cover" : "object-contain"}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (cover && image.naturalWidth && image.naturalHeight) {
                    setCoverDimensions({ source: cover, aspectRatio: image.naturalWidth / image.naturalHeight });
                  }
                }}
              />
            </div>
          ) : null}
          {fullCover ? <span className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/5" /> : null}
        </div>
      ) : null}
      <div className={`relative z-10 px-3 py-3 ${fullCover ? "flex min-h-45 flex-col justify-end" : ""}`}>
        {selectedLabels.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5" aria-label={`Labels: ${selectedLabels.map((item) => item.name).join(", ")}`}>
            {selectedLabels.map((item) => (
              <span key={item.id} title={item.name} className="h-2 w-10 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" style={{ backgroundColor: item.color }} />
            ))}
          </div>
        ) : null}
        <div className="flex items-start">
          {onToggleComplete ? (
            <button
              type="button"
              aria-label={completed ? `Mark ${title} incomplete` : `Mark ${title} complete`}
              title={completed ? "Mark incomplete" : "Mark complete"}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onToggleComplete(id);
              }}
              className={`mt-0.5 flex h-4.5 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:opacity-100 ${completed ? `mr-2 w-4.5 opacity-100 ${fullCover ? "border-white bg-white text-[#0c66e4]" : "border-[#0c66e4] bg-[#0c66e4] text-white"}` : `mr-0 w-0 overflow-hidden border-transparent text-transparent opacity-0 group-hover:mr-2 group-hover:w-4.5 group-hover:opacity-100 group-focus-within:mr-2 group-focus-within:w-4.5 group-focus-within:opacity-100 ${fullCover ? "group-hover:border-white group-focus-within:border-white" : "group-hover:border-[#626f86] group-focus-within:border-[#626f86] hover:border-[#0c66e4]"}`}`}
            >
              <Icon name="check" size={12} />
            </button>
          ) : null}
          <h3 className={`text-sm font-semibold leading-5 transition ${fullCover ? "text-white" : "text-[#172b4d] dark:text-[#f1f2f4]"} ${completed ? `${fullCover ? "text-white/70" : "text-[#626f86] dark:text-[#9fadbc]"} line-through` : ""}`}>{title}</h3>
        </div>
        {dueDate || checklistItems.length > 0 || memberIds.length > 0 ? <div className={`mt-3 flex items-center justify-between gap-2 ${fullCover ? "text-white/80" : "text-[#626f86]"}`}>
          <span className="flex items-center gap-2">{dueDate ? <span className="flex items-center gap-1 text-[11px]"><CalendarClock size={13} /> {new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span> : null}{checklistItems.length ? <span className={`flex items-center gap-1 text-[11px] ${completedChecklistItems === checklistItems.length ? "text-[#1f845a]" : ""}`}><ListChecks size={13} />{completedChecklistItems}/{checklistItems.length}</span> : null}</span>
          {memberIds.length > 0 ? (
            <span className="flex -space-x-1.5">
              {memberIds.map((memberId) => {
                const member = boardMembers.find((item) => item.id === memberId);
                return member ? <span key={member.id} title={`${member.name}${member.role ? ` (${member.role})` : ""}`} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold text-[#30313a] ${member.color}`}>{member.initials}</span> : null;
              })}
            </span>
          ) : null}
        </div> : null}
      </div>
    </div>
  );
}

const quickActions: { label: string; icon: LucideIcon }[] = [
  { label: "Edit labels", icon: Tag },
  { label: "Change members", icon: UserRound },
  { label: "Change cover", icon: ImageIcon },
  { label: "Edit dates", icon: CalendarClock },
  { label: "Move", icon: MoveRight },
  { label: "Copy link", icon: Link2 },
];

function QuickActionMenu({ position, onOpenCard, onEditLabels, onChangeMembers, onChangeCover, onEditDates, onMove, onCopyLink, linkCopied, labelMenuOpen, memberMenuOpen, coverMenuOpen, dateMenuOpen, moveMenuOpen }: { position: MenuPosition; onOpenCard: () => void; onEditLabels: () => void; onChangeMembers: () => void; onChangeCover: () => void; onEditDates: () => void; onMove: () => void; onCopyLink: () => void; linkCopied: boolean; labelMenuOpen: boolean; memberMenuOpen: boolean; coverMenuOpen: boolean; dateMenuOpen: boolean; moveMenuOpen: boolean }) {
  return (
    <div className="fixed z-80 w-44 space-y-1" style={position} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onOpenCard} className="flex h-9 w-full items-center gap-2 rounded-md bg-[#2f3039] px-3 text-left text-sm font-medium text-white shadow-lg transition hover:bg-[#0c66e4]"><CreditCard size={17} /> Open card</button>
      {quickActions.map(({ label, icon: ActionIcon }) => (
        <button
          key={label}
          type="button"
          onClick={label === "Edit labels" ? onEditLabels : label === "Change members" ? onChangeMembers : label === "Change cover" ? onChangeCover : label === "Edit dates" ? onEditDates : label === "Move" ? onMove : onCopyLink}
          className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium shadow-lg transition ${(label === "Edit labels" && labelMenuOpen) || (label === "Change members" && memberMenuOpen) || (label === "Change cover" && coverMenuOpen) || (label === "Edit dates" && dateMenuOpen) || (label === "Move" && moveMenuOpen) ? "bg-white text-[#172b4d]" : "bg-[#2f3039] text-white hover:bg-[#0c66e4]"}`}
        ><ActionIcon size={17} /> {label === "Copy link" && linkCopied ? "Link copied" : label}</button>
      ))}
    </div>
  );
}

function LabelPicker({ card, menuPosition, labels, onToggleLabel, onCreateLabel, onEditLabel, onClose, onBack, placement = "quick" }: { card: BoardCardData; menuPosition: MenuPosition; labels: BoardLabel[]; onToggleLabel: (cardId: string, labelId: string) => void; onCreateLabel: (position: MenuPosition) => void; onEditLabel: (labelId: string, position: MenuPosition) => void; onClose: () => void; onBack?: () => void; placement?: "quick" | "anchored" }) {
  const panelRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const filteredLabels = labels.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const popupWidth = Math.min(320, window.innerWidth - 32);
  const quickMenuWidth = 176;
  const menuGap = 8;
  const rightSideLeft = menuPosition.left + quickMenuWidth + menuGap;
  const leftSideLeft = menuPosition.left - popupWidth - menuGap;
  const desktopLeft = placement === "anchored"
    ? Math.max(16, Math.min(menuPosition.left, window.innerWidth - popupWidth - 16))
    : rightSideLeft + popupWidth <= window.innerWidth - 16
      ? rightSideLeft
      : leftSideLeft >= 16
        ? leftSideLeft
        : Math.max(16, Math.min(rightSideLeft, window.innerWidth - popupWidth - 16));
  const popupTop = useViewportClampedTop(panelRef, placement === "anchored" ? menuPosition.top : menuPosition.top - 48);
  const position = window.innerWidth < 768
    ? { left: Math.max(16, (window.innerWidth - popupWidth) / 2), top: popupTop }
    : {
        left: desktopLeft,
        top: popupTop,
      };

  return (
    <section ref={panelRef} className="fixed z-90 w-[min(340px,calc(100vw-32px))] rounded-xl border border-[#dcdfe4] bg-white p-4 text-[#172b4d] shadow-[0_22px_60px_rgba(21,19,31,0.35)] dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4] md:w-[320px]" style={position} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <header className="grid h-8 grid-cols-[32px_1fr_32px] items-center">
        {onBack ? <button type="button" aria-label="Back to add menu" title="Back" onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b6c78] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]"><ArrowLeft size={17} /></button> : <span />}
        <h3 className="text-center text-sm font-semibold">Labels</h3>
        <button type="button" aria-label="Close label picker" title="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b6c78] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]"><X size={17} /></button>
      </header>
      <div className="relative mt-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#626f86]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus type="search" placeholder="Search labels..." className="h-10 w-full rounded-lg border border-[#b7bec8] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4] dark:border-[#738496] dark:bg-[#22272b] dark:text-[#f1f2f4] dark:placeholder:text-[#9fadbc]" />
      </div>
      <p className="mt-4 text-xs font-semibold text-[#626f86] dark:text-[#9fadbc]">Labels</p>
      <div className="mt-2 space-y-2">
        {filteredLabels.map((item) => {
          const selected = card.labelIds?.includes(item.id) ?? false;
          return (
            <div key={item.id} className="flex w-full items-center gap-3 rounded-lg text-left transition hover:bg-[#f0eef9] dark:hover:bg-[#3b444c]">
              <button type="button" onClick={() => onToggleLabel(card.id, item.id)} className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-[#0c66e4] bg-[#0c66e4] text-white shadow-sm" : "border-[#a9aab5] bg-white text-transparent dark:border-[#738496] dark:bg-[#22272b]"}`}><Check size={14} /></span>
                <span className="flex h-9 min-w-0 flex-1 items-center rounded-md px-3 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" style={{ backgroundColor: item.color }}>{item.name}</span>
              </button>
              <button type="button" aria-label={`Edit ${item.name}`} title={`Edit ${item.name}`} onClick={() => onEditLabel(item.id, position)} className="flex h-9 w-9 items-center justify-center rounded-md text-[#5d5e6b] transition hover:bg-[#e9e7f4] hover:text-[#0c66e4] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c] dark:hover:text-[#85b8ff]"><Pencil size={15} strokeWidth={1.8} /></button>
            </div>
          );
        })}
        {filteredLabels.length === 0 ? <p className="py-4 text-center text-sm text-[#626f86] dark:text-[#9fadbc]">No labels found</p> : null}
      </div>
      <button type="button" onClick={() => onCreateLabel(position)} className="mt-4 flex h-11 w-full items-center justify-center rounded-lg border border-[#d1d1dc] bg-[#f1f1f5] text-sm font-semibold text-[#3c3d48] transition hover:border-[#9586e5] hover:text-[#0c66e4] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#f1f2f4] dark:hover:border-[#579dff] dark:hover:text-[#85b8ff]">Create a new label</button>
    </section>
  );
}

function LabelEditorModal({ initialLabel, position, onClose, onSave, onDelete }: { initialLabel: { id: string; name: string; color: string } | null; position: MenuPosition | null; onClose: () => void; onSave: (label: { id: string; name: string; color: string }) => void; onDelete?: (labelId: string) => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const [title, setTitle] = useState(() => initialLabel?.name ?? "");
  const [selectedColor, setSelectedColor] = useState(() => initialLabel?.color ?? "#2f9c73");
  const isNewLabel = !initialLabel?.name;

  const palette = [
    "#2f9c73", "#d4a725", "#d97706", "#d04437", "#8f4bb3", "#2875d1", "#2c88a3", "#5d8f1f", "#b04a86", "#75777d",
    "#4bb8ae", "#6bbd4a", "#4ea7ff", "#a65dff", "#ff7a7a", "#ffb266", "#ff8a5c", "#e0a94f", "#85d0c4", "#c5c7cf",
  ];

  const editorWidth = Math.min(320, window.innerWidth - 32);
  const editorTop = useViewportClampedTop(panelRef, position?.top ?? 16);
  const editorStyle = position ? {
    left: Math.max(16, Math.min(position.left, window.innerWidth - editorWidth - 16)),
    top: editorTop,
  } : undefined;

  return (
    <div className="fixed inset-0 z-120 bg-transparent p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panelRef} className="absolute w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-xl border border-[#dcdfe4] bg-white p-4 text-[#172b4d] shadow-[0_22px_60px_rgba(21,19,31,0.35)] dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4]" style={editorStyle} onPointerDown={(event) => event.stopPropagation()}>
        <header className="grid grid-cols-[32px_1fr_32px] items-center">
          <button type="button" aria-label="Back to labels" title="Back" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b6c78] hover:bg-[#e9ebf0]"><ArrowLeft size={18} /></button>
          <h3 className="text-center text-sm font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{isNewLabel ? "Create label" : "Edit label"}</h3>
          <button type="button" aria-label="Close label editor" title="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b6c78] hover:bg-[#e9ebf0]"><X size={18} /></button>
        </header>

        <div className="mt-4 rounded-lg bg-[#f4f4f8] p-4 dark:bg-[#22272b]"><div className="h-10 rounded-md border border-black/5 shadow-sm" style={{ backgroundColor: selectedColor }} /></div>

        <label className="mt-4 block text-xs font-semibold text-[#44546f] dark:text-[#b6c2cf]">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#c8c8d3] bg-white px-3 text-sm font-medium text-[#172b4d] outline-none placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/15 dark:border-[#738496] dark:bg-[#22272b] dark:text-[#f1f2f4] dark:placeholder:text-[#9fadbc]" placeholder="Label name" />
        </label>

        <div className="mt-4">
          <p className="text-xs font-semibold text-[#44546f] dark:text-[#b6c2cf]">Select a color</p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {palette.map((color) => (
              <button key={color} type="button" aria-label={`Set color ${color}`} onClick={() => setSelectedColor(color)} className={`relative h-9 rounded-md border-2 transition hover:brightness-95 ${selectedColor === color ? "border-[#0c66e4] ring-2 ring-[#0c66e4]/15" : "border-transparent"}`} style={{ backgroundColor: color }}>
                {selectedColor === color ? <Check size={15} className="absolute inset-0 m-auto text-white" /> : null}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => setSelectedColor("#d8d8df")} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfced8] bg-[#f7f7f9] px-3 text-sm font-medium text-[#44546f] transition hover:border-[#9d8fe8] hover:text-[#0c66e4] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#b6c2cf] dark:hover:border-[#579dff] dark:hover:text-[#85b8ff]">
          <X size={16} /> Remove color
        </button>

        <div className="mt-5 flex items-center justify-between border-t border-[#e1e1e8] pt-4 dark:border-[#454f59]">
          <button type="button" onClick={() => { const trimmed = title.trim() || "New label"; onSave({ id: initialLabel?.id ?? `label-${Date.now()}`, name: trimmed, color: selectedColor }); }} className="h-10 rounded-lg bg-[#0c66e4] px-5 text-sm font-semibold text-white transition hover:bg-[#0055cc]">Save</button>
          {!isNewLabel && initialLabel && onDelete ? <button type="button" onClick={() => onDelete(initialLabel.id)} className="h-10 rounded-lg bg-[#e5574f] px-5 text-sm font-semibold text-white transition hover:bg-[#cc433c]">Delete</button> : null}
        </div>
      </section>
    </div>
  );
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DatePicker({ card, position, onChangeDates, onClose, onBack }: { card: BoardCardData; position: MenuPosition; onChangeDates: (cardId: string, update: CardDateUpdate) => void; onClose: () => void; onBack?: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const panelTop = useViewportClampedTop(panelRef, position.top, 12);
  const today = new Date();
  const initialDueDate = card.dueDate ?? formatDateValue(today);
  const initialDateParts = initialDueDate.split("-").map(Number);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDateParts[0], initialDateParts[1] - 1, 1));
  const [startEnabled, setStartEnabled] = useState(Boolean(card.startDate));
  const [startDate, setStartDate] = useState(card.startDate ?? initialDueDate);
  const [dueEnabled, setDueEnabled] = useState(true);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [dueTime, setDueTime] = useState(card.dueTime ?? "16:00");
  const [recurring, setRecurring] = useState(card.recurring ?? "never");
  const [reminder, setReminder] = useState(card.reminder ?? "1-day");
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const calendarStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1 - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index));

  function selectDueDate(date: Date) {
    const value = formatDateValue(date);
    setDueDate(value);
    setDueEnabled(true);
  }

  return (
    <section ref={panelRef} className="fixed z-90 w-[min(336px,calc(100vw-24px))] rounded-xl border border-[#dcdfe4] bg-white p-3 text-[#172b4d] shadow-[0_22px_60px_rgba(21,19,31,0.35)] dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4]" style={{ left: position.left, top: panelTop }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <header className="grid h-8 grid-cols-[32px_1fr_32px] items-center">
        {onBack ? <button type="button" aria-label="Back to add menu" title="Back" onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#e9ebf0]"><ArrowLeft size={17} /></button> : <span />}
        <h3 className="text-center text-sm font-semibold">Dates</h3>
        <button type="button" aria-label="Close dates" title="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#e9ebf0]"><X size={17} /></button>
      </header>

      <div className="mt-2 flex items-center justify-between">
        <button type="button" aria-label="Previous year" title="Previous year" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear() - 1, date.getMonth(), 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#e9ebf0]"><ChevronsLeft size={16} /></button>
        <button type="button" aria-label="Previous month" title="Previous month" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#e9ebf0]"><Icon name="chevron-right" size={15} className="rotate-180" /></button>
        <p className="min-w-32 text-center text-sm font-semibold">{visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
        <button type="button" aria-label="Next month" title="Next month" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#e9ebf0]"><Icon name="chevron-right" size={15} /></button>
        <button type="button" aria-label="Next year" title="Next year" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear() + 1, date.getMonth(), 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#e9ebf0]"><ChevronsRight size={16} /></button>
      </div>

      <div className="mt-1 grid grid-cols-7 text-center text-[11px] font-semibold text-[#626f86]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {calendarDays.map((date) => {
          const value = formatDateValue(date);
          const selected = dueEnabled && value === dueDate;
          const inMonth = date.getMonth() === visibleMonth.getMonth();
          const isToday = value === formatDateValue(today);
          return <button key={value} type="button" onClick={() => selectDueDate(date)} className={`mx-auto flex h-7 w-8 items-center justify-center rounded-md text-xs transition ${selected ? "bg-[#0c66e4] font-semibold text-white" : inMonth ? "text-[#3d3e48] hover:bg-[#e9f2ff]" : "text-[#aaaab3] hover:bg-[#f2f2f5]"} ${isToday && !selected ? "ring-1 ring-[#1d7afc]" : ""}`}>{date.getDate()}</button>;
        })}
      </div>

      <div className="mt-3 space-y-2 border-t border-[#e1e1e8] pt-3">
        <label className="block text-xs font-semibold text-[#44546f]">Start date</label>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={startEnabled} onChange={(event) => setStartEnabled(event.target.checked)} className="h-4 w-4 accent-[#0c66e4]" />
          <input type="date" value={startDate} disabled={!startEnabled} onChange={(event) => setStartDate(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-[#b7bec8] bg-white px-3 text-sm outline-none disabled:bg-[#ededf1] disabled:text-[#999aa5] focus:border-[#0c66e4]" />
        </div>

        <label className="block text-xs font-semibold text-[#44546f]">Due date</label>
        <div className="grid grid-cols-[16px_minmax(0,1fr)_112px] items-center gap-2">
          <input type="checkbox" checked={dueEnabled} onChange={(event) => setDueEnabled(event.target.checked)} className="h-4 w-4 accent-[#0c66e4]" />
          <input type="date" value={dueDate} disabled={!dueEnabled} onChange={(event) => { setDueDate(event.target.value); const [year, month] = event.target.value.split('-').map(Number); if (year && month) setVisibleMonth(new Date(year, month - 1, 1)); }} className="h-9 min-w-0 rounded-lg border border-[#b7bec8] bg-white px-2 text-sm outline-none disabled:bg-[#ededf1] disabled:text-[#999aa5] focus:border-[#0c66e4]" />
          <input type="time" value={dueTime} disabled={!dueEnabled} onChange={(event) => setDueTime(event.target.value)} className="h-9 min-w-0 rounded-lg border border-[#b7bec8] bg-white px-2 text-sm outline-none disabled:bg-[#ededf1] disabled:text-[#999aa5] focus:border-[#0c66e4]" />
        </div>

        <label className="block text-xs font-semibold text-[#44546f]">Recurring
          <select value={recurring} onChange={(event) => setRecurring(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#b7bec8] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]"><option value="never">Never</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
        </label>
        <label className="block text-xs font-semibold text-[#44546f]">Due date reminder
          <select value={reminder} onChange={(event) => setReminder(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#b7bec8] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]"><option value="none">None</option><option value="at-time">At due time</option><option value="1-hour">1 hour before</option><option value="1-day">1 day before</option><option value="2-days">2 days before</option></select>
        </label>
      </div>

      <button type="button" onClick={() => { onChangeDates(card.id, { startDate: startEnabled ? startDate : undefined, dueDate: dueEnabled ? dueDate : undefined, dueTime: dueEnabled ? dueTime : undefined, recurring, reminder }); onClose(); }} className="mt-3 h-9 w-full rounded-lg bg-[#0c66e4] text-sm font-semibold text-white transition hover:bg-[#0055cc]">Save</button>
      <button type="button" onClick={() => { onChangeDates(card.id, { startDate: undefined, dueDate: undefined, dueTime: undefined, recurring: undefined, reminder: undefined }); onClose(); }} className="mt-1.5 h-9 w-full rounded-lg border border-[#d1d1dc] bg-[#f6f6f8] text-sm font-semibold text-[#44546f] transition hover:border-[#579dff] hover:text-[#0c66e4]">Remove</button>
    </section>
  );
}

function MemberPicker({ card, menuPosition, onToggleMember, onClose, onBack, placement = "quick" }: { card: BoardCardData; menuPosition: MenuPosition; onToggleMember: (cardId: string, memberId: string) => void; onClose: () => void; onBack?: () => void; placement?: "quick" | "anchored" }) {
  const boardMembers = useContext(BoardMembersContext);
  const panelRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const filteredMembers = boardMembers.filter((member) => member.name.toLowerCase().includes(query.trim().toLowerCase()));
  const popupTop = useViewportClampedTop(panelRef, window.innerWidth < 768 ? 80 : placement === "anchored" ? menuPosition.top : menuPosition.top + 40);
  const position = window.innerWidth < 768
    ? { left: Math.max(16, (window.innerWidth - 340) / 2), top: popupTop }
    : {
        left: Math.max(16, Math.min(placement === "anchored" ? menuPosition.left : menuPosition.left + 184, window.innerWidth - 336)),
        top: popupTop,
      };

  return (
    <section ref={panelRef} className="fixed z-90 w-[min(340px,calc(100vw-32px))] rounded-xl border border-[#dcdfe4] bg-white p-4 text-[#172b4d] shadow-[0_22px_60px_rgba(21,19,31,0.35)] dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4] md:w-[320px]" style={position} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <header className="grid h-8 grid-cols-[32px_1fr_32px] items-center">
        {onBack ? <button type="button" aria-label="Back to add menu" title="Back" onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b6c78] hover:bg-[#e9ebf0]"><ArrowLeft size={17} /></button> : <span />}
        <h3 className="text-center text-sm font-semibold">Change members</h3>
        <button type="button" aria-label="Close member picker" title="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b6c78] hover:bg-[#e9ebf0]"><X size={17} /></button>
      </header>
      <div className="relative mt-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#626f86]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus type="search" placeholder="Search members" className="h-10 w-full rounded-lg border border-[#b7bec8] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4] dark:border-[#738496] dark:bg-[#22272b] dark:text-[#f1f2f4] dark:placeholder:text-[#9fadbc]" />
      </div>
      <p className="mt-4 text-xs font-semibold text-[#626f86] dark:text-[#9fadbc]">Board members</p>
      <div className="mt-2 space-y-1">
        {filteredMembers.map((member) => {
          const assigned = card.memberIds?.includes(member.id) ?? false;
          return (
            <button key={member.id} type="button" disabled={(member.role === "Owner" || card.creatorId === member.id) && assigned} title={(member.role === "Owner" || card.creatorId === member.id) && assigned ? "The card creator or board owner cannot be removed" : undefined} onClick={() => onToggleMember(card.id, member.id)} className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition hover:bg-[#e9ebf0] disabled:cursor-not-allowed disabled:bg-[#f5f5f7] disabled:opacity-75 dark:hover:bg-[#3b444c] dark:disabled:bg-[#22272b]">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-[#30313a] ${member.color}`}>{member.initials}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{member.name}</span>
              {member.role ? <span className="rounded bg-[#e9f2ff] px-2 py-1 text-[10px] font-semibold text-[#0c66e4] dark:bg-[#1c3d5d] dark:text-[#85b8ff]">{member.role}</span> : null}
              {assigned ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0c66e4] text-white"><Check size={14} /></span> : null}
            </button>
          );
        })}
        {filteredMembers.length === 0 ? <p className="py-4 text-center text-sm text-[#626f86] dark:text-[#9fadbc]">No members found</p> : null}
      </div>
    </section>
  );
}

function SortableCard({ card, currentList, lists, labels, canEdit, onToggleComplete, onToggleLabel, onToggleMember, onChangeCover, onUploadCover, onChangeDates, onMoveCard, onOpenCard, quickMenuOpen, labelMenuOpen, memberMenuOpen, coverMenuOpen, dateMenuOpen, moveMenuOpen, quickMenuPosition, onQuickEdit, onOpenLabelMenu, onOpenMemberMenu, onOpenCoverMenu, onOpenDateMenu, onOpenMoveMenu, onCloseLabelMenu, onCloseMemberMenu, onCloseCoverMenu, onCloseDateMenu, onCloseMoveMenu, onCloseQuickMenu, onOpenLabelEditor }: { card: BoardCardData; currentList: BoardListData; lists: BoardListData[]; labels: BoardLabel[]; canEdit: boolean; onToggleComplete: (cardId: string) => void; onToggleLabel: (cardId: string, labelId: string) => void; onToggleMember: (cardId: string, memberId: string) => void; onChangeCover: (cardId: string, update: CardCoverUpdate) => void; onUploadCover: (cardId: string, file: File) => void; onChangeDates: (cardId: string, update: CardDateUpdate) => void; onMoveCard: (cardId: string, listId: string, position: number) => void; onOpenCard: (cardId: string) => void; quickMenuOpen: boolean; labelMenuOpen: boolean; memberMenuOpen: boolean; coverMenuOpen: boolean; dateMenuOpen: boolean; moveMenuOpen: boolean; quickMenuPosition: MenuPosition | null; onQuickEdit: (cardId: string, position: MenuPosition) => void; onOpenLabelMenu: (cardId: string) => void; onOpenMemberMenu: (cardId: string) => void; onOpenCoverMenu: (cardId: string) => void; onOpenDateMenu: (cardId: string) => void; onOpenMoveMenu: (cardId: string) => void; onCloseLabelMenu: () => void; onCloseMemberMenu: () => void; onCloseCoverMenu: () => void; onCloseDateMenu: () => void; onCloseMoveMenu: () => void; onCloseQuickMenu: () => void; onOpenLabelEditor: (label: { id: string; name: string; color: string } | null, position: MenuPosition) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: "card" }, disabled: !canEdit });
  const [linkCopied, setLinkCopied] = useState(false);
  const coverPickerPosition = quickMenuPosition ? (() => {
    const popupWidth = Math.min(336, window.innerWidth - 32);
    const gap = 8;
    const rightSideLeft = quickMenuPosition.left + 176 + gap;
    const leftSideLeft = quickMenuPosition.left - popupWidth - gap;
    const left = rightSideLeft + popupWidth <= window.innerWidth - 16
      ? rightSideLeft
      : leftSideLeft >= 16
        ? leftSideLeft
        : Math.max(16, Math.min(rightSideLeft, window.innerWidth - popupWidth - 16));
    const estimatedPopupHeight = 660;
    return {
      left,
      top: Math.max(16, Math.min(quickMenuPosition.top - 48, window.innerHeight - estimatedPopupHeight - 16)),
    };
  })() : null;
  const datePickerPosition = quickMenuPosition ? (() => {
    const popupWidth = Math.min(336, window.innerWidth - 32);
    const gap = 8;
    const rightSideLeft = quickMenuPosition.left + 176 + gap;
    const leftSideLeft = quickMenuPosition.left - popupWidth - gap;
    const left = rightSideLeft + popupWidth <= window.innerWidth - 16
      ? rightSideLeft
      : leftSideLeft >= 16
        ? leftSideLeft
        : Math.max(16, Math.min(rightSideLeft, window.innerWidth - popupWidth - 16));
    return { left, top: Math.max(16, Math.min(quickMenuPosition.top - 48, window.innerHeight - 720 - 16)) };
  })() : null;
  const movePickerPosition = datePickerPosition;

  async function copyCardLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("card", card.id);
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      const input = document.createElement("textarea");
      input.value = url.toString();
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1500);
  }

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
      className={`relative rounded-lg focus-visible:outline-none ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isDragging ? "opacity-25" : ""}`}
      onClick={() => onOpenCard(card.id)}
      {...attributes}
      {...listeners}
    >
      <CardContent {...card} labels={labels} onToggleComplete={canEdit ? onToggleComplete : undefined} onQuickEdit={canEdit ? onQuickEdit : undefined} />
      {canEdit && quickMenuOpen && quickMenuPosition ? createPortal(<QuickActionMenu position={quickMenuPosition} onOpenCard={() => { onCloseQuickMenu(); onOpenCard(card.id); }} onEditLabels={() => onOpenLabelMenu(card.id)} onChangeMembers={() => onOpenMemberMenu(card.id)} onChangeCover={() => onOpenCoverMenu(card.id)} onEditDates={() => onOpenDateMenu(card.id)} onMove={() => onOpenMoveMenu(card.id)} onCopyLink={copyCardLink} linkCopied={linkCopied} labelMenuOpen={labelMenuOpen} memberMenuOpen={memberMenuOpen} coverMenuOpen={coverMenuOpen} dateMenuOpen={dateMenuOpen} moveMenuOpen={moveMenuOpen} />, document.body) : null}
      {labelMenuOpen && quickMenuPosition ? createPortal(<LabelPicker card={card} menuPosition={quickMenuPosition} labels={labels} onToggleLabel={onToggleLabel} onCreateLabel={(position) => onOpenLabelEditor({ id: `label-${Date.now()}`, name: "", color: "#2f9c73" }, position)} onEditLabel={(labelId, position) => { const found = labels.find((label) => label.id === labelId); if (found) onOpenLabelEditor({ ...found }, position); }} onClose={onCloseLabelMenu} />, document.body) : null}
      {memberMenuOpen && quickMenuPosition ? createPortal(<MemberPicker card={card} menuPosition={quickMenuPosition} onToggleMember={onToggleMember} onClose={onCloseMemberMenu} />, document.body) : null}
      {coverMenuOpen && coverPickerPosition ? createPortal(<CoverPicker card={card} onChangeCover={onChangeCover} onUploadCover={onUploadCover} onClose={onCloseCoverMenu} variant="popover" position={coverPickerPosition} />, document.body) : null}
      {dateMenuOpen && datePickerPosition ? createPortal(<DatePicker card={card} position={datePickerPosition} onChangeDates={onChangeDates} onClose={onCloseDateMenu} />, document.body) : null}
      {moveMenuOpen && movePickerPosition ? createPortal(<MoveCardPanel card={card} currentList={currentList} lists={lists} onMove={onMoveCard} onClose={onCloseMoveMenu} variant="popover" menuPosition={movePickerPosition} />, document.body) : null}
    </article>
  );
}

function BoardList({ list, lists, labels, canEdit, onAddCard, onRenameList, onArchiveList, onDeleteList, onCopyList, onMoveList, onSortList, onToggleComplete, onToggleLabel, onToggleMember, onChangeCover, onUploadCover, onChangeDates, onMoveCard, onOpenCard, quickMenuCardId, labelMenuCardId, memberMenuCardId, coverMenuCardId, dateMenuCardId, moveMenuCardId, quickMenuPosition, onQuickEdit, onOpenLabelMenu, onOpenMemberMenu, onOpenCoverMenu, onOpenDateMenu, onOpenMoveMenu, onCloseLabelMenu, onCloseMemberMenu, onCloseCoverMenu, onCloseDateMenu, onCloseMoveMenu, onCloseQuickMenu, onOpenLabelEditor }: { list: BoardListData; lists: BoardListData[]; labels: BoardLabel[]; canEdit: boolean; onAddCard: (listId: string, title: string, atTop?: boolean) => void; onRenameList: (listId: string, title: string) => void; onArchiveList: (listId: string) => void; onDeleteList: (listId: string) => void; onCopyList: (listId: string) => void; onMoveList: (listId: string, direction: -1 | 1) => void; onSortList: (listId: string) => void; onToggleComplete: (cardId: string) => void; onToggleLabel: (cardId: string, labelId: string) => void; onToggleMember: (cardId: string, memberId: string) => void; onChangeCover: (cardId: string, update: CardCoverUpdate) => void; onUploadCover: (cardId: string, file: File) => void; onChangeDates: (cardId: string, update: CardDateUpdate) => void; onMoveCard: (cardId: string, listId: string, position: number) => void; onOpenCard: (cardId: string) => void; quickMenuCardId: string | null; labelMenuCardId: string | null; memberMenuCardId: string | null; coverMenuCardId: string | null; dateMenuCardId: string | null; moveMenuCardId: string | null; quickMenuPosition: MenuPosition | null; onQuickEdit: (cardId: string, position: MenuPosition) => void; onOpenLabelMenu: (cardId: string) => void; onOpenMemberMenu: (cardId: string) => void; onOpenCoverMenu: (cardId: string) => void; onOpenDateMenu: (cardId: string) => void; onOpenMoveMenu: (cardId: string) => void; onCloseLabelMenu: () => void; onCloseMemberMenu: () => void; onCloseCoverMenu: () => void; onCloseDateMenu: () => void; onCloseMoveMenu: () => void; onCloseQuickMenu: () => void; onOpenLabelEditor: (label: { id: string; name: string; color: string } | null, position: MenuPosition) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: list.id, data: { type: "list" }, disabled: !canEdit });
  const containsQuickMenu = list.cards.some((card) => card.id === quickMenuCardId);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [scrollThumb, setScrollThumb] = useState({ height: 0, top: 0, visible: false });
  const [addingCard, setAddingCard] = useState(false);
  const [addAtTop, setAddAtTop] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);
  const cancelRenameRef = useRef(false);
  const titlePointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const titleWasDraggedRef = useRef(false);

  function submitNewCard() {
    const title = newCardTitle.trim();
    if (!title) return;
    onAddCard(list.id, title, addAtTop);
    setNewCardTitle("");
  }

  function finishRenaming() {
    if (cancelRenameRef.current) {
      cancelRenameRef.current = false;
      setListTitle(list.title);
    } else {
      const title = listTitle.trim();
      if (title) onRenameList(list.id, title);
      else setListTitle(list.title);
    }
    setEditingTitle(false);
  }

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    const content = scrollContentRef.current;
    if (!viewport || !content) return;
    const scrollViewport = viewport;
    const scrollContent = content;

    function updateScrollThumb() {
      const clientHeight = scrollViewport.clientHeight;
      const scrollHeight = scrollViewport.scrollHeight;
      if (scrollHeight <= clientHeight + 1) {
        setScrollThumb((current) => current.visible || current.height !== 0 || current.top !== 0
          ? { height: 0, top: 0, visible: false }
          : current);
        return;
      }

      const height = Math.round(Math.max(36, (clientHeight * clientHeight) / scrollHeight));
      const availableTravel = clientHeight - height;
      const top = Math.round((scrollViewport.scrollTop / (scrollHeight - clientHeight)) * availableTravel);
      setScrollThumb((current) => current.visible && current.height === height && current.top === top
        ? current
        : { height, top, visible: true });
    }

    const frameId = window.requestAnimationFrame(updateScrollThumb);
    const observer = new ResizeObserver(updateScrollThumb);
    observer.observe(scrollViewport);
    observer.observe(scrollContent);
    window.addEventListener("resize", updateScrollThumb);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", updateScrollThumb);
    };
  }, [list.cards]);

  return (
    <section ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative grid h-fit max-h-full w-71.5 shrink-0 self-start grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border bg-[#f1f2f4]/95 p-3 text-[#172b4d] shadow-[0_8px_24px_rgba(20,21,30,0.16)] backdrop-blur dark:bg-[#101214]/95 dark:text-[#f1f2f4] ${containsQuickMenu ? "z-40" : "z-0"} ${isDragging ? "opacity-25" : ""} ${isOver ? "border-[#1d7afc] ring-2 ring-[#1d7afc]/40" : "border-white/40 dark:border-[#454f59]"}`}>
      <header className={`mb-3 flex h-8 shrink-0 touch-none items-center justify-between px-1 ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`} {...attributes} {...listeners}>
        {editingTitle ? (
          <input
            value={listTitle}
            onChange={(event) => setListTitle(event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
            onBlur={finishRenaming}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelRenameRef.current = true;
                event.currentTarget.blur();
              }
            }}
            autoFocus
            aria-label={`Rename ${list.title} list`}
            className="h-8 min-w-0 flex-1 rounded-md border border-[#0c66e4] bg-white px-2 text-sm font-semibold text-[#2b2c35] outline-none ring-2 ring-[#0c66e4]/15 dark:border-[#579dff] dark:bg-[#22272b] dark:text-[#f1f2f4]"
          />
        ) : (
          <button
            type="button"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              titlePointerStartRef.current = { x: event.clientX, y: event.clientY };
              titleWasDraggedRef.current = false;
            }}
            onPointerMove={(event) => {
              const start = titlePointerStartRef.current;
              if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 6) titleWasDraggedRef.current = true;
            }}
            onPointerUp={() => { titlePointerStartRef.current = null; }}
            onPointerCancel={() => { titlePointerStartRef.current = null; titleWasDraggedRef.current = false; }}
            onClick={() => {
              if (!canEdit) return;
              if (titleWasDraggedRef.current) {
                titleWasDraggedRef.current = false;
                return;
              }
              cancelRenameRef.current = false;
              setListTitle(list.title);
              setEditingTitle(true);
            }}
            className="min-w-0 flex-1 truncate rounded-md px-1 py-1 text-left text-sm font-semibold text-[#2b2c35] hover:bg-black/5 dark:text-[#f1f2f4] dark:hover:bg-white/10"
            title={canEdit ? "Rename list" : list.title}
          >{list.title}</button>
        )}
        {canEdit ? <button type="button" aria-label={`Open ${list.title} actions`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setListMenuOpen((open) => !open); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#626f86] hover:bg-black/10 dark:text-[#b6c2cf] dark:hover:bg-white/10 dark:hover:text-[#f1f2f4]"><MoreHorizontal size={18} /></button> : null}
      </header>
      {listMenuOpen ? <div role="menu" className="absolute right-2 top-11 z-50 w-52 rounded-lg border border-[#dcdfe4] bg-white p-2 text-sm text-[#172b4d] shadow-xl dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4]" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" role="menuitem" onClick={() => { setAddAtTop(true); setAddingCard(true); setListMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]">Add card at top</button>
        <button type="button" role="menuitem" onClick={() => { onCopyList(list.id); setListMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]">Copy list</button>
        <button type="button" role="menuitem" disabled={lists[0]?.id === list.id} onClick={() => { onMoveList(list.id, -1); setListMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left hover:bg-[#e9ebf0] disabled:opacity-40 dark:hover:bg-[#3b444c]">Move left</button>
        <button type="button" role="menuitem" disabled={lists.at(-1)?.id === list.id} onClick={() => { onMoveList(list.id, 1); setListMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left hover:bg-[#e9ebf0] disabled:opacity-40 dark:hover:bg-[#3b444c]">Move right</button>
        <button type="button" role="menuitem" onClick={() => { onSortList(list.id); setListMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]">Sort by title</button>
        <div className="my-1 border-t border-[#dcdfe4] dark:border-[#454f59]" />
        <button type="button" role="menuitem" onClick={() => { onArchiveList(list.id); setListMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]">Archive list</button>
        <button type="button" role="menuitem" onClick={() => { if (window.confirm(`Permanently delete “${list.title}” and all its cards?`)) onDeleteList(list.id); setListMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left text-[#c9372c] hover:bg-red-50 dark:text-[#ff8f73] dark:hover:bg-red-950/40">Delete list</button>
      </div> : null}
      <div className="relative min-h-0 flex-1">
        <div ref={scrollViewportRef} onScroll={() => {
          const viewport = scrollViewportRef.current;
          if (!viewport || !scrollThumb.visible) return;
          const availableTravel = viewport.clientHeight - scrollThumb.height;
          const top = Math.round((viewport.scrollTop / (viewport.scrollHeight - viewport.clientHeight)) * availableTravel);
          setScrollThumb((current) => current.top === top ? current : { ...current, top });
        }} className="board-list-scrollbar h-full w-full overflow-y-auto">
          <SortableContext items={list.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
            <div ref={scrollContentRef} className="space-y-2.5">
              {list.cards.map((card) => <SortableCard key={card.id} card={card} currentList={list} lists={lists} labels={labels} canEdit={canEdit} onToggleComplete={onToggleComplete} onToggleLabel={onToggleLabel} onToggleMember={onToggleMember} onChangeCover={onChangeCover} onUploadCover={onUploadCover} onChangeDates={onChangeDates} onMoveCard={onMoveCard} onOpenCard={onOpenCard} quickMenuOpen={quickMenuCardId === card.id} labelMenuOpen={labelMenuCardId === card.id} memberMenuOpen={memberMenuCardId === card.id} coverMenuOpen={coverMenuCardId === card.id} dateMenuOpen={dateMenuCardId === card.id} moveMenuOpen={moveMenuCardId === card.id} quickMenuPosition={quickMenuPosition} onQuickEdit={onQuickEdit} onOpenLabelMenu={onOpenLabelMenu} onOpenMemberMenu={onOpenMemberMenu} onOpenCoverMenu={onOpenCoverMenu} onOpenDateMenu={onOpenDateMenu} onOpenMoveMenu={onOpenMoveMenu} onCloseLabelMenu={onCloseLabelMenu} onCloseMemberMenu={onCloseMemberMenu} onCloseCoverMenu={onCloseCoverMenu} onCloseDateMenu={onCloseDateMenu} onCloseMoveMenu={onCloseMoveMenu} onCloseQuickMenu={onCloseQuickMenu} onOpenLabelEditor={onOpenLabelEditor} />)}
            </div>
          </SortableContext>
        </div>
        {scrollThumb.visible ? <span aria-hidden="true" className="pointer-events-none absolute -right-2 top-0 w-1 rounded-full bg-[#0c66e4]/45" style={{ height: scrollThumb.height, transform: `translateY(${scrollThumb.top}px)` }} /> : null}
      </div>
      {!canEdit ? null : addingCard ? (
        <form onSubmit={(event) => { event.preventDefault(); submitNewCard(); }} className="mt-3 shrink-0">
          <textarea
            value={newCardTitle}
            onChange={(event) => setNewCardTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setAddingCard(false);
                setNewCardTitle("");
              } else if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitNewCard();
              }
            }}
            autoFocus
            rows={2}
            placeholder="Enter a title or paste a link"
            className="min-h-18 w-full resize-none rounded-lg border border-[#d7d7e1] bg-white px-3 py-2.5 text-sm text-[#172b4d] shadow-sm outline-none placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/15 dark:border-[#738496] dark:bg-[#22272b] dark:text-[#f1f2f4] dark:placeholder:text-[#9fadbc]"
          />
          <div className="mt-2 flex items-center gap-2">
            <button type="submit" disabled={!newCardTitle.trim()} className="h-9 rounded-lg bg-[#0c66e4] px-4 text-sm font-semibold text-white transition hover:bg-[#0055cc] disabled:cursor-not-allowed disabled:opacity-45">Add card</button>
            <span title="Press Enter to add the card" className="flex h-9 items-center gap-1.5 rounded-lg bg-[#6f3294] px-3 text-sm font-semibold text-white"><Lightbulb size={16} /> Tip</span>
            <button type="button" aria-label="Close add card" title="Close" onClick={() => { setAddingCard(false); setNewCardTitle(""); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#44546f] transition hover:bg-black/10 hover:text-[#172b4d] dark:text-[#b6c2cf] dark:hover:bg-white/10 dark:hover:text-[#f1f2f4]"><X size={19} /></button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setAddAtTop(false); setAddingCard(true); }} className="mt-3 flex h-9 w-full shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#44546f] transition hover:bg-black/10 hover:text-[#0c66e4] dark:text-[#b6c2cf] dark:hover:bg-white/10 dark:hover:text-[#85b8ff]">
          <Icon name="plus" size={17} /> Add a card
        </button>
      )}
    </section>
  );
}

function MoveCardPanel({ card, currentList, lists, onMove, onClose, variant = "dialog", menuPosition }: { card: BoardCardData; currentList: BoardListData; lists: BoardListData[]; onMove: (cardId: string, listId: string, position: number) => void; onClose: () => void; variant?: "dialog" | "popover"; menuPosition?: MenuPosition }) {
  const panelRef = useRef<HTMLElement>(null);
  const [targetListId, setTargetListId] = useState(currentList.id);
  const targetList = lists.find((list) => list.id === targetListId) ?? currentList;
  const positionCount = targetList.cards.filter((item) => item.id !== card.id).length + 1;
  const [position, setPosition] = useState(() => currentList.cards.findIndex((item) => item.id === card.id) + 1);
  const popupTop = useViewportClampedTop(panelRef, menuPosition?.top ?? 16);

  function changeTargetList(listId: string) {
    const nextList = lists.find((list) => list.id === listId);
    setTargetListId(listId);
    setPosition((nextList?.cards.filter((item) => item.id !== card.id).length ?? 0) + 1);
  }

  return (
    <section
      ref={panelRef}
      className={variant === "popover"
        ? "fixed z-90 w-[min(336px,calc(100vw-32px))] rounded-xl border border-[#dcdfe4] bg-white p-4 text-[#172b4d] shadow-[0_22px_60px_rgba(20,18,30,0.35)]"
        : "absolute left-4 top-14 z-40 w-[min(340px,calc(100%-2rem))] rounded-xl border border-[#dcdfe4] bg-white p-4 text-[#172b4d] shadow-[0_22px_60px_rgba(20,18,30,0.35)] md:left-6 md:top-16 md:w-84"}
      style={variant === "popover" ? { left: menuPosition?.left, top: popupTop } : undefined}
      onPointerDown={variant === "popover" ? (event) => event.stopPropagation() : undefined}
      onClick={variant === "popover" ? (event) => event.stopPropagation() : undefined}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Move card</h3>
        <button type="button" aria-label="Close move card panel" title="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#676875] hover:bg-[#e9ebf0]"><X size={17} /></button>
      </header>
      <div className="mt-4 border-b border-[#e1e1e8] pb-4">
        <p className="text-xs font-semibold text-[#626f86]">Suggested</p>
        <button type="button" onClick={() => { const nextList = lists.find((list) => list.id !== currentList.id); if (nextList) changeTargetList(nextList.id); }} className="mt-2 flex h-10 w-full items-center gap-2 rounded-lg border border-[#d7d7e1] px-3 text-left text-sm font-medium hover:border-[#9586e5] hover:text-[#0c66e4]"><MoveRight size={16} /> Move to the next list</button>
      </div>
      <p className="mt-4 text-xs font-semibold text-[#626f86]">Select destination</p>
      <label className="mt-3 block text-xs font-semibold text-[#44546f]">
        Board
        <select disabled className="mt-1 h-11 w-full rounded-lg border border-[#d1d1dc] bg-[#f3f3f6] px-3 text-sm font-medium text-[#44546f]"><option>Current board</option></select>
      </label>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_90px] gap-2">
        <label className="text-xs font-semibold text-[#44546f]">
          List
          <select value={targetListId} onChange={(event) => changeTargetList(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#b7bec8] bg-white px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4]">
            {lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#44546f]">
          Position
          <select value={Math.min(position, positionCount)} onChange={(event) => setPosition(Number(event.target.value))} className="mt-1 h-11 w-full rounded-lg border border-[#b7bec8] bg-white px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4]">
            {Array.from({ length: positionCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
      </div>
      <button type="button" onClick={() => { onMove(card.id, targetListId, Math.min(position, positionCount)); onClose(); }} className="mt-4 h-10 w-full rounded-lg bg-[#0c66e4] text-sm font-semibold text-white transition hover:bg-[#0055cc]">Move</button>
    </section>
  );
}

function CoverPicker({ card, onChangeCover, onUploadCover, onClose, variant = "drawer", position }: { card: BoardCardData; onChangeCover: (cardId: string, update: CardCoverUpdate) => void; onUploadCover: (cardId: string, file: File) => void; onClose: () => void; variant?: "drawer" | "popover"; position?: MenuPosition }) {
  const panelRef = useRef<HTMLElement>(null);
  const popupTop = useViewportClampedTop(panelRef, position?.top ?? 16);

  return (
    <aside
      ref={panelRef}
      className={variant === "drawer"
        ? "absolute right-0 top-0 z-50 w-full rounded-xl border border-[#dcdfe4] bg-[#f4f4f7] p-5 text-[#172b4d] shadow-[-18px_12px_50px_rgba(20,18,30,0.2)] sm:w-85"
        : "fixed z-90 w-[min(336px,calc(100vw-32px))] rounded-xl border border-[#dcdfe4] bg-white p-4 text-[#172b4d] shadow-[0_22px_60px_rgba(21,19,31,0.35)]"}
      style={variant === "popover" ? { left: position?.left, top: popupTop } : undefined}
      onPointerDown={variant === "popover" ? (event) => event.stopPropagation() : undefined}
      onClick={variant === "popover" ? (event) => event.stopPropagation() : undefined}
    >
      <header className="flex h-9 items-center justify-center">
        <h3 className="text-sm font-semibold">Cover</h3>
        <button type="button" aria-label="Close cover panel" title="Close" onClick={onClose} className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-md text-[#676875] hover:bg-[#e5e5eb]"><X size={17} /></button>
      </header>

      <section className="mt-5">
        <h4 className="text-xs font-semibold text-[#44546f]">Size</h4>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["header", "full"] as const).map((size) => (
            <button key={size} type="button" aria-label={`Use ${size} cover mode`} onClick={() => onChangeCover(card.id, { cover: card.cover, coverColor: card.coverColor, coverSize: size })} className={`h-17.5 rounded-lg border-2 bg-white p-2 text-left transition ${card.coverSize === size || (!card.coverSize && size === "header") ? "border-[#0c66e4]" : "border-[#d2d2dc] hover:border-[#9b8de5]"}`}>
              <span className={`block rounded bg-[#9a9ba5] ${size === "full" ? "h-8" : "h-4"}`} />
              <span className="mt-2 block h-1.5 w-4/5 rounded bg-[#c4c4cb]" />
              <span className="mt-1 block h-1.5 w-3/5 rounded bg-[#d1d1d7]" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h4 className="text-xs font-semibold text-[#44546f]">Colors</h4>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {cardCoverColors.map((coverColor) => (
            <button key={coverColor} type="button" aria-label={`Use ${coverColor} cover color`} onClick={() => onChangeCover(card.id, { cover: undefined, coverColor, coverSize: card.coverSize ?? "header" })} className={`relative h-9 rounded-lg border-2 transition hover:brightness-95 ${card.coverColor === coverColor ? "border-[#172b4d]" : "border-white"}`} style={{ backgroundColor: coverColor }}>
              {card.coverColor === coverColor ? <Check size={15} className="absolute inset-0 m-auto text-white" /> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 border-t border-[#d8d8e0] pt-5">
        <h4 className="text-xs font-semibold text-[#44546f]">Attachment</h4>
        <label className="mt-2 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ceced9] bg-white text-sm font-medium text-[#44546f] transition hover:border-[#9586e5] hover:text-[#0c66e4]">
          <Upload size={16} /> Upload a cover image
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadCover(card.id, file); }} />
        </label>
        <p className="mt-2 text-xs leading-4 text-[#7a7b87]">Choose an image from your computer.</p>
      </section>

      <section className="mt-5">
        <h4 className="text-xs font-semibold text-[#44546f]">Cover photos</h4>
        <div className="mt-2 grid grid-cols-3 gap-2">
        {cardCoverOptions.map((cover) => {
          const selected = card.cover === cover.src;
          return (
            <button key={cover.src} type="button" aria-label={`Use ${cover.name} cover`} onClick={() => onChangeCover(card.id, { cover: cover.src, coverColor: undefined, coverSize: card.coverSize ?? "header" })} className={`group relative aspect-16/10 overflow-hidden rounded-lg border-2 transition hover:border-[#1d7afc] ${selected ? "border-[#0c66e4]" : "border-transparent"}`}>
              <Image src={cover.src} alt="" fill sizes="95px" className="object-cover transition group-hover:brightness-90" />
              {selected ? <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0c66e4] text-white shadow"><Check size={12} /></span> : null}
            </button>
          );
        })}
        </div>
      </section>
      <button type="button" disabled={!card.cover && !card.coverColor} onClick={() => onChangeCover(card.id, { cover: undefined, coverColor: undefined, coverSize: card.coverSize ?? "header" })} className="mt-5 h-10 w-full rounded-lg border border-[#ceced9] bg-white text-sm font-medium text-[#5c5d69] transition hover:border-[#579dff] hover:text-[#0c66e4] disabled:cursor-not-allowed disabled:opacity-45">Remove cover</button>
    </aside>
  );
}

function AddToCardMenu({ position, onLabels, onDates, onMembers, onChecklist, onAttachment, onCustomFields, onClose }: { position: MenuPosition; onLabels: () => void; onDates: () => void; onMembers: () => void; onChecklist: () => void; onAttachment: () => void; onCustomFields: () => void; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const popupTop = useViewportClampedTop(panelRef, position.top);
  const actions = [
    { label: "Labels", description: "Organize, categorize, and prioritize", icon: Tag, onClick: onLabels },
    { label: "Dates", description: "Start dates, due dates, and reminders", icon: CalendarClock, onClick: onDates },
    { label: "Members", description: "Assign members", icon: UserRound, onClick: onMembers },
    { label: "Checklist", description: "Track smaller tasks and progress", icon: ListChecks, onClick: onChecklist },
  ];

  return (
    <section ref={panelRef} className="fixed z-90 w-[min(336px,calc(100vw-24px))] rounded-xl border border-[#dcdfe4] bg-white p-3 text-[#172b4d] shadow-[0_22px_60px_rgba(21,19,31,0.35)] dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4]" style={{ left: position.left, top: popupTop }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <header className="grid h-9 grid-cols-[32px_1fr_32px] items-center">
        <span />
        <h3 className="text-center text-sm font-semibold">Add to card</h3>
        <button type="button" aria-label="Close add menu" title="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]"><X size={17} /></button>
      </header>
      <div className="mt-2 space-y-1">
        {actions.map(({ label, description, icon: ActionIcon, onClick }) => (
          <button key={label} type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#d5d5df] bg-[#f7f7f9] text-[#5f606d] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#b6c2cf]"><ActionIcon size={19} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-[#626f86] dark:text-[#9fadbc]">{description}</span></span>
          </button>
        ))}
        <button type="button" onClick={onAttachment} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#d5d5df] bg-[#f7f7f9] text-[#5f606d] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#b6c2cf]"><Paperclip size={19} /></span>
          <span><span className="block text-sm font-semibold">Attachment</span><span className="mt-0.5 block text-xs text-[#626f86] dark:text-[#9fadbc]">Add files and links</span></span>
        </button>
        <button type="button" onClick={onCustomFields} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#d5d5df] bg-[#f7f7f9] text-[#5f606d] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#b6c2cf]"><SlidersHorizontal size={19} /></span>
          <span><span className="block text-sm font-semibold">Custom Fields</span><span className="mt-0.5 block text-xs text-[#626f86] dark:text-[#9fadbc]">Create your own fields</span></span>
        </button>
      </div>
    </section>
  );
}

function ChecklistBlock({ checklist, cardId, onDelete, onAddItem, onToggleItem, onDeleteItem }: { checklist: CardChecklist; cardId: string; onDelete: (cardId: string, checklistId: string) => void; onAddItem: (cardId: string, checklistId: string, title: string) => void; onToggleItem: (cardId: string, itemId: string, completed: boolean) => void; onDeleteItem: (cardId: string, itemId: string) => void }) {
  const [itemTitle, setItemTitle] = useState("");
  const complete = checklist.items.filter((item) => item.completed).length;
  const percent = checklist.items.length ? Math.round((complete / checklist.items.length) * 100) : 0;
  return <section className="mt-6 md:ml-8">
    <div className="flex items-center gap-3"><ListChecks size={20} className="text-[#44546f]" /><h3 className="flex-1 font-semibold">{checklist.title}</h3><button type="button" onClick={() => onDelete(cardId, checklist.id)} aria-label={`Delete ${checklist.title}`} className="rounded p-2 text-[#626f86] hover:bg-red-50 hover:text-[#c9372c]"><Trash2 size={16} /></button></div>
    <div className="mt-3 flex items-center gap-3"><span className="w-8 text-xs text-[#626f86]">{percent}%</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-[#dcdfe4]"><span className="block h-full rounded-full bg-[#0c66e4] transition-[width]" style={{ width: `${percent}%` }} /></span></div>
    <div className="mt-3 space-y-1">{checklist.items.map((item) => <div key={item.id} className="group flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-[#e9ebf0]"><input type="checkbox" checked={item.completed} onChange={() => onToggleItem(cardId, item.id, !item.completed)} className="mt-0.5 h-4 w-4 accent-[#0c66e4]" /><span className={`min-w-0 flex-1 text-sm ${item.completed ? "text-[#626f86] line-through" : ""}`}>{item.title}</span><button type="button" aria-label={`Delete ${item.title}`} onClick={() => onDeleteItem(cardId, item.id)} className="text-[#626f86] opacity-0 hover:text-[#c9372c] group-hover:opacity-100 focus:opacity-100"><Trash2 size={15} /></button></div>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); const title = itemTitle.trim(); if (!title) return; onAddItem(cardId, checklist.id, title); setItemTitle(""); }} className="mt-3 flex gap-2"><input value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} placeholder="Add an item" className="h-9 min-w-0 flex-1 rounded-md border border-[#b7bec8] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]" /><button type="submit" disabled={!itemTitle.trim()} className="rounded-md bg-[#0c66e4] px-3 text-sm font-semibold text-white disabled:opacity-45">Add</button></form>
  </section>;
}

function ReadOnlyCardModal({ card, currentList, labels, onClose }: { card: BoardCardData; currentList: BoardListData; labels: BoardLabel[]; onClose: () => void }) {
  const selectedLabels = labels.filter((label) => card.labelIds?.includes(label.id));
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#091e42]/65 p-3 pt-[7vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="readonly-card-title" className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#dcdfe4] bg-[#f7f8f9] text-[#172b4d] shadow-2xl dark:border-[#454f59] dark:bg-[#1d2125] dark:text-[#f1f2f4]">
      {card.cover || card.coverColor ? <div className="relative h-48 bg-[#0c66e4]" style={card.coverColor ? { backgroundColor: card.coverColor } : undefined}>{card.cover ? <Image src={card.cover} alt="" fill sizes="672px" unoptimized={card.cover.startsWith("data:") || card.cover.startsWith("blob:")} className="object-cover" /> : null}</div> : null}
      <div className="p-6"><div className="flex items-start gap-4"><div className="min-w-0 flex-1"><h2 id="readonly-card-title" className={`text-2xl font-semibold ${card.completed ? "line-through opacity-70" : ""}`}>{card.title}</h2><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">in list {currentList.title}</p></div><button type="button" aria-label="Close card details" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[#e9ebf0] dark:hover:bg-[#282e33]"><Icon name="x" size={20} /></button></div>
        {selectedLabels.length ? <div className="mt-5 flex flex-wrap gap-2">{selectedLabels.map((label) => <span key={label.id} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: label.color }}>{label.name || "Label"}</span>)}</div> : null}
        {card.description ? <section className="mt-7"><h3 className="font-semibold">Description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#44546f] dark:text-[#b6c2cf]">{card.description}</p></section> : null}
        {card.dueDate ? <p className="mt-6 text-sm text-[#44546f] dark:text-[#b6c2cf]"><strong>Due:</strong> {new Date(`${card.dueDate}T00:00:00`).toLocaleDateString()}{card.dueTime ? ` at ${card.dueTime.slice(0, 5)}` : ""}</p> : null}
        {card.checklists?.map((checklist) => <section key={checklist.id} className="mt-7"><h3 className="font-semibold">{checklist.title}</h3><div className="mt-2 space-y-2">{checklist.items.map((item) => <div key={item.id} className="flex items-center gap-2 text-sm"><span className={`flex h-4 w-4 items-center justify-center rounded border ${item.completed ? "border-[#1f845a] bg-[#1f845a] text-white" : "border-[#8590a2]"}`}>{item.completed ? <Icon name="check" size={11} /> : null}</span><span className={item.completed ? "line-through opacity-70" : ""}>{item.title}</span></div>)}</div></section>)}
        {card.comments?.length ? <section className="mt-7 border-t border-[#dcdfe4] pt-5 dark:border-[#454f59]"><h3 className="font-semibold">Comments</h3><div className="mt-3 space-y-3">{card.comments.map((comment) => <div key={comment.id} className="rounded-lg bg-white p-3 text-sm dark:bg-[#282e33]"><strong>{comment.author}</strong><p className="mt-1 whitespace-pre-wrap">{comment.text}</p></div>)}</div></section> : null}
      </div>
    </section>
  </div>;
}

function CardDetailModal({ card, currentList, lists, labels, onClose, onToggleComplete, onToggleLabel, onToggleMember, onRenameCard, onMoveCard, onChangeCover, onUploadCover, onChangeDates, onChangeDescription, onAddComment, onAddAttachment, onAddCustomField, onAddChecklist, onDeleteChecklist, onAddChecklistItem, onToggleChecklistItem, onDeleteChecklistItem, onCopyCard, onArchiveCard, onDeleteCard, onOpenLabelEditor }: { card: BoardCardData; currentList: BoardListData; lists: BoardListData[]; labels: BoardLabel[]; onClose: () => void; onToggleComplete: (cardId: string) => void; onToggleLabel: (cardId: string, labelId: string) => void; onToggleMember: (cardId: string, memberId: string) => void; onRenameCard: (cardId: string, title: string) => void; onMoveCard: (cardId: string, listId: string, position: number) => void; onChangeCover: (cardId: string, update: CardCoverUpdate) => void; onUploadCover: (cardId: string, file: File) => void; onChangeDates: (cardId: string, update: CardDateUpdate) => void; onChangeDescription: (cardId: string, description: string) => void; onAddComment: (cardId: string, text: string) => void; onAddAttachment: (cardId: string, file: File) => void; onAddCustomField: (cardId: string, name: string, value: string) => void; onAddChecklist: (cardId: string, title: string) => void; onDeleteChecklist: (cardId: string, checklistId: string) => void; onAddChecklistItem: (cardId: string, checklistId: string, title: string) => void; onToggleChecklistItem: (cardId: string, itemId: string, completed: boolean) => void; onDeleteChecklistItem: (cardId: string, itemId: string) => void; onCopyCard: (cardId: string, listId: string) => void; onArchiveCard: (cardId: string) => void; onDeleteCard: (cardId: string) => void; onOpenLabelEditor: (label: BoardLabel, position: MenuPosition) => void }) {
  const boardMembers = useContext(BoardMembersContext);
  const [movePanelOpen, setMovePanelOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [datePickerPosition, setDatePickerPosition] = useState<MenuPosition | null>(null);
  const [labelPickerPosition, setLabelPickerPosition] = useState<MenuPosition | null>(null);
  const [memberPickerPosition, setMemberPickerPosition] = useState<MenuPosition | null>(null);
  const [addMenuPosition, setAddMenuPosition] = useState<MenuPosition | null>(null);
  const [addMenuView, setAddMenuView] = useState<"main" | "labels" | "dates" | "members">("main");
  const [editingTitle, setEditingTitle] = useState(false);
  const [cardTitle, setCardTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [comment, setComment] = useState("");
  const [customFieldOpen, setCustomFieldOpen] = useState(false);
  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("Checklist");
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLElement>(!customFieldOpen && !checklistOpen);
  const cancelTitleEditRef = useRef(false);
  const primaryLabelColor = labels.find((label) => card.labelIds?.includes(label.id))?.color ?? "#a0a1aa";
  const activityMember = boardMembers.find((member) => card.memberIds?.includes(member.id)) ?? boardMembers[0];

  function finishTitleEdit() {
    if (cancelTitleEditRef.current) {
      cancelTitleEditRef.current = false;
      setCardTitle(card.title);
    } else {
      const title = cardTitle.trim();
      if (title) onRenameCard(card.id, title);
      else setCardTitle(card.title);
    }
    setEditingTitle(false);
  }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (checklistOpen) {
        setChecklistOpen(false);
      } else if (customFieldOpen) {
        setCustomFieldOpen(false);
      } else if (movePanelOpen || coverPickerOpen || datePickerPosition || labelPickerPosition || memberPickerPosition || addMenuPosition) {
        setMovePanelOpen(false);
        setCoverPickerOpen(false);
        setDatePickerPosition(null);
        setLabelPickerPosition(null);
        setMemberPickerPosition(null);
        setAddMenuPosition(null);
      } else {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [addMenuPosition, checklistOpen, coverPickerOpen, customFieldOpen, datePickerPosition, labelPickerPosition, memberPickerPosition, movePanelOpen, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#091e42]/65 p-3 pt-[6vh] backdrop-blur-sm md:p-8 md:pt-[8vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="card-detail-title" className="relative w-full max-w-280 overflow-visible rounded-xl border border-white/20 bg-[#f7f7fa] text-[#172b4d] shadow-[0_28px_80px_rgba(17,15,26,0.4)] dark:border-[#454f59] dark:bg-[#1d2125] dark:text-[#f1f2f4]">
        <header className={`relative overflow-hidden rounded-t-xl border-b border-white/20 bg-[#0c66e4] transition-[height] duration-200 ${card.cover ? card.coverSize === "full" ? "h-80" : "h-70" : "h-32"}`} style={card.coverColor ? { backgroundColor: card.coverColor } : undefined}>
          <div className={`relative h-full ${card.coverSize === "full" ? "w-full" : "mx-auto w-[58%] max-w-95"}`}>
            {card.cover ? <Image src={card.cover} alt="" fill sizes={card.coverSize === "full" ? "1120px" : "380px"} unoptimized={card.cover.startsWith("data:") || card.cover.startsWith("blob:")} className={card.coverSize === "full" ? "object-cover" : "object-contain"} /> : null}
          </div>
          <div className="absolute inset-x-0 top-0 flex items-center px-4 py-3 md:px-6">
            <button type="button" onClick={() => { setCoverPickerOpen(false); setDatePickerPosition(null); setLabelPickerPosition(null); setMemberPickerPosition(null); setAddMenuPosition(null); setMovePanelOpen((open) => !open); }} className="flex h-9 items-center gap-2 rounded-lg bg-white/90 px-3 text-sm font-semibold text-[#393a44] shadow-sm backdrop-blur transition hover:bg-white">
              {currentList.title} <span className="rotate-90"><Icon name="chevron-right" size={14} /></span>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" aria-label="Change card cover" title="Change cover" onClick={() => { setMovePanelOpen(false); setDatePickerPosition(null); setLabelPickerPosition(null); setMemberPickerPosition(null); setAddMenuPosition(null); setCoverPickerOpen((open) => !open); }} className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition ${coverPickerOpen ? "bg-[#0c66e4]" : "bg-[#172b4d]/85 hover:bg-[#0c66e4]"}`}><ImageIcon size={18} /></button>
              <button type="button" aria-label="Close card details" title="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#172b4d]/85 text-white transition hover:bg-[#0c66e4]"><Icon name="x" size={21} /></button>
            </div>
          </div>
        </header>
        {movePanelOpen ? <MoveCardPanel card={card} currentList={currentList} lists={lists} onMove={onMoveCard} onClose={() => setMovePanelOpen(false)} /> : null}
        {coverPickerOpen ? <CoverPicker card={card} onChangeCover={onChangeCover} onUploadCover={onUploadCover} onClose={() => setCoverPickerOpen(false)} /> : null}
        {datePickerPosition ? createPortal(<DatePicker card={card} position={datePickerPosition} onChangeDates={onChangeDates} onClose={() => setDatePickerPosition(null)} />, document.body) : null}
        {labelPickerPosition ? createPortal(<LabelPicker card={card} menuPosition={labelPickerPosition} labels={labels} onToggleLabel={onToggleLabel} onCreateLabel={(position) => onOpenLabelEditor({ id: `label-${Date.now()}`, name: "", color: "#2f9c73" }, position)} onEditLabel={(labelId, position) => { const label = labels.find((item) => item.id === labelId); if (label) onOpenLabelEditor(label, position); }} onClose={() => setLabelPickerPosition(null)} placement="anchored" />, document.body) : null}
        {memberPickerPosition ? createPortal(<MemberPicker card={card} menuPosition={memberPickerPosition} onToggleMember={onToggleMember} onClose={() => setMemberPickerPosition(null)} placement="anchored" />, document.body) : null}
        {addMenuPosition && addMenuView === "main" ? createPortal(<AddToCardMenu position={addMenuPosition} onLabels={() => setAddMenuView("labels")} onDates={() => setAddMenuView("dates")} onMembers={() => setAddMenuView("members")} onChecklist={() => { setAddMenuPosition(null); setChecklistOpen(true); }} onAttachment={() => { setAddMenuPosition(null); attachmentInputRef.current?.click(); }} onCustomFields={() => { setAddMenuPosition(null); setCustomFieldOpen(true); }} onClose={() => setAddMenuPosition(null)} />, document.body) : null}
        {addMenuPosition && addMenuView === "labels" ? createPortal(<LabelPicker card={card} menuPosition={addMenuPosition} labels={labels} onToggleLabel={onToggleLabel} onCreateLabel={(position) => onOpenLabelEditor({ id: `label-${Date.now()}`, name: "", color: "#2f9c73" }, position)} onEditLabel={(labelId, position) => { const label = labels.find((item) => item.id === labelId); if (label) onOpenLabelEditor(label, position); }} onClose={() => setAddMenuPosition(null)} onBack={() => setAddMenuView("main")} placement="anchored" />, document.body) : null}
        {addMenuPosition && addMenuView === "dates" ? createPortal(<DatePicker card={card} position={addMenuPosition} onChangeDates={onChangeDates} onClose={() => setAddMenuPosition(null)} onBack={() => setAddMenuView("main")} />, document.body) : null}
        {addMenuPosition && addMenuView === "members" ? createPortal(<MemberPicker card={card} menuPosition={addMenuPosition} onToggleMember={onToggleMember} onClose={() => setAddMenuPosition(null)} onBack={() => setAddMenuView("main")} placement="anchored" />, document.body) : null}
        <input ref={attachmentInputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAddAttachment(card.id, file); event.target.value = ""; }} />
        {customFieldOpen ? createPortal(<div className="fixed inset-0 z-120 flex items-center justify-center bg-[#172b4d]/35 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setCustomFieldOpen(false); }}><form onSubmit={(event) => { event.preventDefault(); const name = customFieldName.trim(); const value = customFieldValue.trim(); if (!name || !value) return; onAddCustomField(card.id, name, value); setCustomFieldName(""); setCustomFieldValue(""); setCustomFieldOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="custom-field-title" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 id="custom-field-title" className="text-lg font-semibold">Add custom field</h3><button type="button" aria-label="Close" onClick={() => setCustomFieldOpen(false)}><X size={18} /></button></div><input autoFocus value={customFieldName} onChange={(event) => setCustomFieldName(event.target.value)} placeholder="Field name" className="mt-5 h-10 w-full rounded-md border border-[#cfd1da] px-3 outline-none focus:border-[#0c66e4]" /><input value={customFieldValue} onChange={(event) => setCustomFieldValue(event.target.value)} placeholder="Value" className="mt-3 h-10 w-full rounded-md border border-[#cfd1da] px-3 outline-none focus:border-[#0c66e4]" /><button type="submit" disabled={!customFieldName.trim() || !customFieldValue.trim()} className="mt-5 h-10 w-full rounded-md bg-[#0c66e4] text-sm font-semibold text-white disabled:opacity-45">Add field</button></form></div>, document.body) : null}
        {checklistOpen ? createPortal(<div className="fixed inset-0 z-120 flex items-center justify-center bg-[#172b4d]/35 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setChecklistOpen(false); }}><form onSubmit={(event) => { event.preventDefault(); const title = checklistTitle.trim(); if (!title) return; onAddChecklist(card.id, title); setChecklistTitle("Checklist"); setChecklistOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="checklist-title" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 id="checklist-title" className="text-lg font-semibold">Add checklist</h3><button type="button" aria-label="Close" onClick={() => setChecklistOpen(false)}><X size={18} /></button></div><label className="mt-5 block text-sm font-semibold">Title<input autoFocus value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cfd1da] px-3 outline-none focus:border-[#0c66e4]" /></label><button type="submit" disabled={!checklistTitle.trim()} className="mt-5 h-10 rounded-md bg-[#0c66e4] px-4 text-sm font-semibold text-white disabled:opacity-45">Add</button></form></div>, document.body) : null}

        <div className="grid overflow-hidden rounded-b-xl md:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="min-w-0 px-5 py-7 md:px-8 md:py-9">
            <div className="flex items-start gap-3">
              <button type="button" aria-label={card.completed ? "Mark card incomplete" : "Mark card complete"} onClick={() => onToggleComplete(card.id)} className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${card.completed ? "border-[#0c66e4] bg-[#0c66e4] text-white" : "border-[#8a8b97] text-transparent hover:border-[#0c66e4]"}`}><Icon name="check" size={15} /></button>
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <input
                    id="card-detail-title"
                    value={cardTitle}
                    onChange={(event) => setCardTitle(event.target.value)}
                    onBlur={finishTitleEdit}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.blur();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        cancelTitleEditRef.current = true;
                        event.currentTarget.blur();
                      }
                    }}
                    autoFocus
                    aria-label="Rename card"
                    className="h-10 w-full rounded-lg border border-[#0c66e4] bg-white px-2 text-[22px] font-semibold text-[#172b4d] outline-none ring-2 ring-[#0c66e4]/15 dark:bg-[#282e33] dark:text-[#f1f2f4]"
                  />
                ) : (
                  <button id="card-detail-title" type="button" onClick={() => { cancelTitleEditRef.current = false; setCardTitle(card.title); setEditingTitle(true); }} className={`w-full rounded-md px-1 py-0.5 text-left text-[25px] font-semibold leading-tight hover:bg-black/5 dark:hover:bg-white/5 ${card.completed ? "text-[#626f86] line-through dark:text-[#9fadbc]" : "text-[#172b4d] dark:text-[#f1f2f4]"}`} title="Rename card">{card.title}</button>
                )}
                <p className="mt-1 text-sm text-[#626f86]">in list <span className="font-medium text-[#44546f]">{currentList.title}</span></p>
              </div>
            </div>

            <div className="ml-0 mt-7 flex flex-wrap gap-2 md:ml-9">
              <button type="button" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const popupWidth = Math.min(336, window.innerWidth - 24); setMovePanelOpen(false); setCoverPickerOpen(false); setDatePickerPosition(null); setLabelPickerPosition(null); setMemberPickerPosition(null); setAddMenuView("main"); setAddMenuPosition((current) => current ? null : { left: Math.max(12, Math.min(rect.left, window.innerWidth - popupWidth - 12)), top: rect.bottom + 8 }); }} className={`flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium hover:border-[#579dff] hover:text-[#0c66e4] ${addMenuPosition ? "border-[#0c66e4] text-[#0c66e4]" : "border-[#b7bec8] text-[#44546f]"}`}><Icon name="plus" size={16} /> Add</button>
              <button type="button" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setMovePanelOpen(false); setCoverPickerOpen(false); setDatePickerPosition(null); setAddMenuPosition(null); setMemberPickerPosition(null); setLabelPickerPosition((current) => current ? null : { left: rect.left, top: rect.bottom + 8 }); }} className={`flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium hover:border-[#579dff] hover:text-[#0c66e4] ${labelPickerPosition ? "border-[#0c66e4] text-[#0c66e4]" : "border-[#b7bec8] text-[#44546f]"}`}><span className="h-3 w-5 rounded-full border border-black/5" style={{ backgroundColor: primaryLabelColor }} /> Labels</button>
              <button type="button" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const popupWidth = Math.min(336, window.innerWidth - 24); setMovePanelOpen(false); setCoverPickerOpen(false); setAddMenuPosition(null); setLabelPickerPosition(null); setMemberPickerPosition(null); setDatePickerPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - popupWidth - 12)), top: rect.bottom + 8 }); }} className={`flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium hover:border-[#579dff] hover:text-[#0c66e4] ${datePickerPosition ? "border-[#0c66e4] text-[#0c66e4]" : "border-[#b7bec8] text-[#44546f]"}`}><Icon name="calendar" size={16} /> Dates</button>
              <button type="button" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setMovePanelOpen(false); setCoverPickerOpen(false); setDatePickerPosition(null); setAddMenuPosition(null); setLabelPickerPosition(null); setMemberPickerPosition((current) => current ? null : { left: rect.left, top: rect.bottom + 8 }); }} className={`flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium hover:border-[#579dff] hover:text-[#0c66e4] ${memberPickerPosition ? "border-[#0c66e4] text-[#0c66e4]" : "border-[#b7bec8] text-[#44546f]"}`}><Icon name="plus" size={16} /> Members</button>
            </div>

            <div className="mt-9">
              <div className="flex items-center gap-3"><Icon name="tasks" size={20} className="text-[#44546f]" /><h3 className="text-base font-semibold">Description</h3></div>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => onChangeDescription(card.id, description)} aria-label="Card description" placeholder="Add a more detailed description..." className="mt-4 min-h-28 w-full resize-y rounded-lg border border-[#ceceda] bg-white p-4 text-sm outline-none placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4] dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4] md:ml-8 md:w-[calc(100%-2rem)]" />
              {(card.customFields?.length ?? 0) > 0 ? <div className="mt-5 grid gap-2 md:ml-8">{card.customFields?.map((field) => <div key={field.id} className="rounded-lg border border-[#dcdfe4] bg-white px-4 py-3"><p className="text-xs font-semibold text-[#626f86]">{field.name}</p><p className="mt-1 text-sm text-[#172b4d]">{field.value}</p></div>)}</div> : null}
              {card.checklists?.map((checklist) => <ChecklistBlock key={checklist.id} checklist={checklist} cardId={card.id} onDelete={onDeleteChecklist} onAddItem={onAddChecklistItem} onToggleItem={onToggleChecklistItem} onDeleteItem={onDeleteChecklistItem} />)}
              {(card.attachments?.length ?? 0) > 0 ? <div className="mt-5 md:ml-8"><h3 className="text-sm font-semibold">Attachments</h3><div className="mt-2 space-y-2">{card.attachments?.map((attachment) => <a key={attachment.id} href={attachment.url} download={attachment.name} className="flex items-center gap-2 rounded-lg border border-[#dcdfe4] bg-white px-3 py-2 text-sm text-[#0c66e4] hover:bg-[#e9f2ff]"><Paperclip size={16} />{attachment.name}</a>)}</div></div> : null}
            </div>
          </div>

          <aside className="border-t border-[#dcdfe4] bg-[#efeff3] px-5 py-7 dark:border-[#454f59] dark:bg-[#22272b] md:border-l md:border-t-0 md:px-6 md:py-9">
            <div className="mb-6"><h3 className="text-xs font-semibold uppercase tracking-wide text-[#626f86]">Actions</h3><div className="mt-2 grid grid-cols-3 gap-2"><button type="button" onClick={() => onCopyCard(card.id, currentList.id)} className="flex flex-col items-center gap-1 rounded-lg border border-[#d2d2dc] bg-white px-2 py-2 text-xs font-semibold hover:border-[#579dff] hover:text-[#0c66e4]"><Copy size={17} />Copy</button><button type="button" onClick={() => { onArchiveCard(card.id); onClose(); }} className="flex flex-col items-center gap-1 rounded-lg border border-[#d2d2dc] bg-white px-2 py-2 text-xs font-semibold hover:border-[#579dff] hover:text-[#0c66e4]"><Archive size={17} />Archive</button><button type="button" onClick={() => { if (window.confirm(`Permanently delete “${card.title}”?`)) { onDeleteCard(card.id); onClose(); } }} className="flex flex-col items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-2 text-xs font-semibold text-[#c9372c] hover:bg-red-50"><Trash2 size={17} />Delete</button></div></div>
            <div className="flex items-center gap-2"><Icon name="tasks" size={19} className="text-[#44546f]" /><h3 className="font-semibold">Comments and activity</h3></div>
            <form onSubmit={(event) => { event.preventDefault(); const text = comment.trim(); if (!text) return; onAddComment(card.id, text); setComment(""); }}>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} aria-label="Write a comment" placeholder="Write a comment..." className="mt-5 min-h-12 w-full resize-none rounded-lg border border-[#d2d2dc] bg-white p-3 text-sm outline-none placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4] dark:border-[#454f59] dark:bg-[#1d2125] dark:text-[#f1f2f4]" />
              {comment.trim() ? <button type="submit" className="mt-2 h-8 rounded-lg bg-[#0c66e4] px-3 text-xs font-semibold text-white hover:bg-[#0055cc]">Add comment</button> : null}
            </form>
            <div className="mt-5 flex items-start gap-3">
              <Avatar label={activityMember?.initials ?? "U"} />
              <div className="text-sm leading-5"><p><span className="font-semibold">{activityMember?.name ?? "A member"}</span> added this card to {currentList.title}</p></div>
            </div>
            {(card.comments ?? []).map((item) => <div key={item.id} className="mt-5 flex items-start gap-3"><Avatar label={item.author.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U"} /><div className="min-w-0 text-sm leading-5"><p><span className="font-semibold">{item.author}</span> commented</p><p className="mt-1 break-words rounded-lg bg-white px-3 py-2 text-[#454651] shadow-sm dark:bg-[#1d2125] dark:text-[#f1f2f4]">{item.text}</p><p className="mt-1 text-xs text-[#626f86] dark:text-[#9fadbc]">{item.createdAt}</p></div></div>)}
          </aside>
        </div>
      </section>
    </div>
  );
}

export function BoardView({ boardSlug }: BoardViewProps) {
  const [lists, setLists] = useState<BoardListData[]>([]);
  const [activeBoardView, setActiveBoardView] = useState<"board" | "table" | "calendar">("board");
  const [boardLabels, setBoardLabels] = useState<BoardLabel[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [boardMemberIds, setBoardMemberIds] = useState<Set<string>>(new Set());
  const [board, setBoard] = useState<BoardSummary>({ id: "", workspaceId: "", title: "Loading...", workspace: "Loading..." });
  const [allBoardEntries, setAllBoardEntries] = useState<Array<[string, BoardSummary]>>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [quickMenuCardId, setQuickMenuCardId] = useState<string | null>(null);
  const [labelMenuCardId, setLabelMenuCardId] = useState<string | null>(null);
  const [memberMenuCardId, setMemberMenuCardId] = useState<string | null>(null);
  const [coverMenuCardId, setCoverMenuCardId] = useState<string | null>(null);
  const [dateMenuCardId, setDateMenuCardId] = useState<string | null>(null);
  const [moveMenuCardId, setMoveMenuCardId] = useState<string | null>(null);
  const [labelEditor, setLabelEditor] = useState<BoardLabel | null>(null);
  const [labelEditorPosition, setLabelEditorPosition] = useState<MenuPosition | null>(null);
  const [quickMenuPosition, setQuickMenuPosition] = useState<MenuPosition | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [boardStarred, setBoardStarred] = useState(false);
  const [starAnimating, setStarAnimating] = useState(false);
  const [boardSwitcherOpen, setBoardSwitcherOpen] = useState(false);
  const [boardSearch, setBoardSearch] = useState("");
  const [boardScope, setBoardScope] = useState<"all" | "workspace">("all");
  const [boardListView, setBoardListView] = useState(false);
  const [boardSwitcherPinned, setBoardSwitcherPinned] = useState(false);
  const [workspaceBoardsOpen, setWorkspaceBoardsOpen] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState("");
  const [filterLabelId, setFilterLabelId] = useState("");
  const [filterDue, setFilterDue] = useState<"all" | "overdue" | "week" | "none">("all");
  const [shareCopied, setShareCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [busyBoardMemberIds, setBusyBoardMemberIds] = useState<Set<string>>(new Set());
  const [boardOwnerId, setBoardOwnerId] = useState("");
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState("");
  const [canManageBoard, setCanManageBoard] = useState(false);
  const [canEditBoard, setCanEditBoard] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [boardMenuTab, setBoardMenuTab] = useState<"about" | "activity" | "automation" | "power-ups" | "archived">("about");
  const [boardActivities, setBoardActivities] = useState<BoardActivityItem[]>([]);
  const [archivedLists, setArchivedLists] = useState<ArchivedBoardItem[]>([]);
  const [archivedCards, setArchivedCards] = useState<ArchivedBoardItem[]>([]);
  const [automations, setAutomations] = useState<BoardAutomationItem[]>([]);
  const [automationName, setAutomationName] = useState("");
  const [automationTrigger, setAutomationTrigger] = useState<"card_created" | "card_moved">("card_moved");
  const [automationTriggerListId, setAutomationTriggerListId] = useState("");
  const [automationAction, setAutomationAction] = useState<"mark_complete" | "move_to_list">("mark_complete");
  const [automationActionListId, setAutomationActionListId] = useState("");
  const [powerUps, setPowerUps] = useState({ calendar: true, table: true, card_aging: false });
  const [boardDescription, setBoardDescription] = useState("");
  const [loadedBoardSlug, setLoadedBoardSlug] = useState<string | null>(null);
  const starAnimationTimerRef = useRef<number | null>(null);
  const listsBeforeDrag = useRef<BoardListData[] | null>(null);
  const didDrag = useRef(false);
  const switcherDialogRef = useDialogFocus<HTMLElement>(boardSwitcherOpen);
  const helpDialogRef = useDialogFocus<HTMLElement>(helpOpen);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeCard = lists.flatMap((list) => list.cards).find((card) => card.id === activeCardId);
  const activeList = lists.find((list) => list.id === activeListId);
  const selectedList = lists.find((list) => list.cards.some((card) => card.id === selectedCardId));
  const selectedCard = selectedList?.cards.find((card) => card.id === selectedCardId);
  const searchedBoards = allBoardEntries.filter(([, details]) => details.title.toLowerCase().includes(boardSearch.trim().toLowerCase()));
  const workspaceBoards = searchedBoards.filter(([, details]) => details.workspace === board.workspace);
  const visibleBoards = boardScope === "workspace" ? workspaceBoards : searchedBoards;
  const normalizedCardSearch = cardSearch.trim().toLowerCase();
  const hasCardFilters = Boolean(normalizedCardSearch || filterMemberId || filterLabelId || filterDue !== "all");
  const filteredLists = lists.map((list) => ({ ...list, cards: list.cards.filter((card) => {
    const matchesText = !normalizedCardSearch || `${card.title} ${card.description ?? ""} ${(card.comments ?? []).map((comment) => comment.text).join(" ")}`.toLowerCase().includes(normalizedCardSearch);
    const matchesMember = !filterMemberId || card.memberIds?.includes(filterMemberId);
    const matchesLabel = !filterLabelId || card.labelIds?.includes(filterLabelId);
    let matchesDue = true;
    if (filterDue === "none") matchesDue = !card.dueDate;
    if ((filterDue === "overdue" || filterDue === "week") && card.dueDate) {
      const due = new Date(`${card.dueDate}T23:59:59`).getTime();
      const now = Date.now();
      matchesDue = filterDue === "overdue" ? due < now && !card.completed : due >= now && due <= now + 7 * 86400000;
    } else if ((filterDue === "overdue" || filterDue === "week") && !card.dueDate) matchesDue = false;
    return matchesText && matchesMember && matchesLabel && matchesDue;
  }) }));
  const filteredCardCount = filteredLists.reduce((count, list) => count + list.cards.length, 0);
  const viewCards = filteredLists.flatMap((list) => list.cards.map((card) => ({ card, list })));
  const calendarGroups = Object.entries(viewCards.reduce<Record<string, typeof viewCards>>((groups, item) => {
    const key = item.card.dueDate ?? "Unscheduled";
    (groups[key] ??= []).push(item);
    return groups;
  }, {}))
    .sort(([first], [second]) => first === "Unscheduled" ? 1 : second === "Unscheduled" ? -1 : first.localeCompare(second));

  function renderBoardSwitcherBoards(boards: typeof visibleBoards) {
    if (boards.length === 0) return <p className="py-8 text-center text-sm text-[#626f86] dark:text-[#9fadbc]">No boards found</p>;

    return (
      <div className={boardListView ? "space-y-2" : "flex flex-wrap gap-2.5"}>
        {boards.map(([slug, details]) => {
          const current = slug === boardSlug;
          return boardListView ? (
            <Link key={slug} href={`/boards/${slug}`} onClick={() => setBoardSwitcherOpen(false)} className={`flex h-15 items-center gap-3 rounded-lg p-2 transition-colors ${current ? "bg-[#e9f2ff] dark:bg-[#1c3d5d]" : "hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]"}`}>
              <span className="relative flex h-11 w-18 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#dfe1e6] dark:bg-[#454f59]">{details.cover ? <Image src={details.cover} alt="" fill sizes="72px" className="object-cover" /> : <Icon name="grid" size={18} />}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{details.title}</span>
              {current ? <Check size={17} className="text-[#0c66e4]" /> : null}
            </Link>
          ) : (
            <Link key={slug} href={`/boards/${slug}`} onClick={() => setBoardSwitcherOpen(false)} className={`w-36 overflow-hidden rounded-lg bg-white shadow-sm transition-transform hover:-translate-y-0.5 dark:bg-[#22272b] ${current ? "ring-2 ring-[#0c66e4]" : "ring-1 ring-[#dcdfe4] dark:ring-[#454f59]"}`}>
              <span className="relative flex h-20 w-full items-center justify-center overflow-hidden bg-[#dfe1e6] dark:bg-[#454f59]">{details.cover ? <Image src={details.cover} alt="" fill sizes="144px" className="object-cover" /> : <Icon name="grid" size={22} />}</span>
              <span className="block truncate px-2 py-2.5 text-sm font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{details.title}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  useEffect(() => () => {
    if (starAnimationTimerRef.current !== null) window.clearTimeout(starAnimationTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      setLoadedBoardSlug(null);
      setSelectedCardId(null);
      try {
        const [{ board: loadedBoard, permissions }, workspaceData] = await Promise.all([
          apiGet<{ board: ApiBoard; permissions: BoardPermissions }>(`/boards/${boardSlug}`),
          apiGet<{ workspaces: ApiWorkspace[] }>("/workspaces"),
        ]);
        const loadedWorkspaces = workspaceData.workspaces;
        const currentWorkspace = loadedWorkspaces.find((workspace) => String(workspace.id) === String(loadedBoard.workspaceId));
        const boardGroups = await Promise.all(loadedWorkspaces.map(async (workspace) => {
          const data = await apiGet<{ boards: ApiBoardSummary[] }>(`/boards?workspaceId=${workspace.id}`);
          return data.boards.map((item): [string, BoardSummary] => [item.slug, {
            id: String(item.id),
            workspaceId: String(workspace.id),
            title: item.title,
            workspace: workspace.name,
            cover: item.coverUrl ?? undefined,
          }]);
        }));

        if (cancelled) return;
        setBoard({ id: String(loadedBoard.id), workspaceId: String(loadedBoard.workspaceId), title: loadedBoard.title, workspace: currentWorkspace?.name ?? loadedBoard.workspace?.name ?? "Workspace", description: loadedBoard.description ?? undefined, visibility: loadedBoard.visibility, cover: loadedBoard.coverUrl ?? undefined });
        setBoardDescription(loadedBoard.description ?? "");
        setBoardOwnerId(String(loadedBoard.ownerId));
        setWorkspaceOwnerId(String(currentWorkspace?.ownerId ?? ""));
        setAllBoardEntries(boardGroups.flat());
        setBoardLabels(loadedBoard.labels.map((label) => ({ id: String(label.id), name: label.name, color: label.color })));
        const availableMembers = currentWorkspace?.members?.length ? currentWorkspace.members : loadedBoard.members;
        setBoardMembers(availableMembers.map((member, index) => ({ id: String(member.id), name: member.name, email: member.email, initials: member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: ["bg-[#ff8a5c]", "bg-[#a6c6fb]", "bg-[#dab9ff]"][index % 3], role: String(member.id) === String(loadedBoard.ownerId) ? "Owner" : "Member" })));
        setBoardMemberIds(new Set(loadedBoard.members.map((member) => String(member.id))));
        setCanManageBoard(permissions.canAdmin);
        setCanEditBoard(permissions.canEdit);
        const loadedLists = loadedBoard.lists.map((list) => ({ id: String(list.id), title: list.title, cards: list.cards.map(mapApiCard) }));
        setLists(loadedLists);
        const requestedCardId = new URLSearchParams(window.location.search).get("card");
        if (requestedCardId && loadedLists.some((list) => list.cards.some((card) => card.id === requestedCardId))) setSelectedCardId(requestedCardId);
        setBoardStarred(loadedBoard.starred);
        setRequestError(null);
        setLoadedBoardSlug(boardSlug);
      } catch (error) {
        if (!cancelled) setRequestError(error instanceof Error ? error.message : "Failed to load board");
      }
    }

    loadBoard();
    return () => { cancelled = true; };
  }, [boardSlug]);

  async function toggleBoardStar() {
    const nextStarred = !boardStarred;
    setBoardStarred(nextStarred);
    setStarAnimating(true);
    if (starAnimationTimerRef.current !== null) window.clearTimeout(starAnimationTimerRef.current);
    starAnimationTimerRef.current = window.setTimeout(() => setStarAnimating(false), 180);
    try {
      await apiPatch(`/boards/${board.id}`, { starred: nextStarred });
      setRequestError(null);
    } catch (error) {
      setBoardStarred(!nextStarred);
      setRequestError(error instanceof Error ? error.message : "Failed to update board");
    }
  }

  useEffect(() => {
    if (!boardSwitcherOpen) return;

    function closeBoardSwitcherOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setBoardSwitcherOpen(false);
    }

    window.addEventListener("keydown", closeBoardSwitcherOnEscape);
    return () => {
      window.removeEventListener("keydown", closeBoardSwitcherOnEscape);
    };
  }, [boardSwitcherOpen]);

  useEffect(() => {
    if (loadedBoardSlug !== boardSlug) return;
    const linkedCardId = new URLSearchParams(window.location.search).get("card");
    if (!linkedCardId || !lists.some((list) => list.cards.some((card) => card.id === linkedCardId))) return;
    const openTimer = window.setTimeout(() => setSelectedCardId(linkedCardId), 0);
    return () => window.clearTimeout(openTimer);
  }, [boardSlug, lists, loadedBoardSlug]);

  useEffect(() => {
    if (!helpOpen) return;
    function closeHelp(event: KeyboardEvent) { if (event.key === "Escape") setHelpOpen(false); }
    window.addEventListener("keydown", closeHelp);
    return () => window.removeEventListener("keydown", closeHelp);
  }, [helpOpen]);

  useEffect(() => {
    if (!quickMenuCardId) return;

    function closeQuickMenu(event: PointerEvent) {
      if (event.defaultPrevented) return;
      setQuickMenuCardId(null);
      setLabelMenuCardId(null);
      setMemberMenuCardId(null);
      setCoverMenuCardId(null);
      setDateMenuCardId(null);
      setMoveMenuCardId(null);
      setQuickMenuPosition(null);
    }

    function closeQuickMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuickMenuCardId(null);
        setLabelMenuCardId(null);
        setMemberMenuCardId(null);
        setCoverMenuCardId(null);
        setDateMenuCardId(null);
        setMoveMenuCardId(null);
        setQuickMenuPosition(null);
      }
    }

    window.addEventListener("pointerdown", closeQuickMenu);
    window.addEventListener("keydown", closeQuickMenuOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeQuickMenu);
      window.removeEventListener("keydown", closeQuickMenuOnEscape);
    };
  }, [quickMenuCardId]);

  function findListIndex(itemId: string, boardLists = lists) {
    return boardLists.findIndex(
      (list) => list.id === itemId || list.cards.some((card) => card.id === itemId),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    if (!canEditBoard) return;
    didDrag.current = true;
    setQuickMenuCardId(null);
    setLabelMenuCardId(null);
    setMemberMenuCardId(null);
    setCoverMenuCardId(null);
    setDateMenuCardId(null);
    setMoveMenuCardId(null);
    setQuickMenuPosition(null);
    listsBeforeDrag.current = lists;
    if (event.active.data.current?.type === "list") {
      setActiveCardId(null);
      setActiveListId(String(event.active.id));
    } else {
      setActiveListId(null);
      setActiveCardId(String(event.active.id));
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canEditBoard) return;
    if (event.active.data.current?.type === "list") return;
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setLists((currentLists) => {
      const sourceListIndex = findListIndex(activeId, currentLists);
      const targetListIndex = findListIndex(overId, currentLists);

      if (sourceListIndex < 0 || targetListIndex < 0 || sourceListIndex === targetListIndex) {
        return currentLists;
      }

      const nextLists = currentLists.map((list) => ({ ...list, cards: [...list.cards] }));
      const sourceCards = nextLists[sourceListIndex].cards;
      const sourceCardIndex = sourceCards.findIndex((card) => card.id === activeId);
      if (sourceCardIndex < 0) return currentLists;

      const [movedCard] = sourceCards.splice(sourceCardIndex, 1);
      const targetCards = nextLists[targetListIndex].cards;
      const targetCardIndex = targetCards.findIndex((card) => card.id === overId);
      targetCards.splice(targetCardIndex < 0 ? targetCards.length : targetCardIndex, 0, movedCard);
      return nextLists;
    });
  }

  function handleDragCancel() {
    if (listsBeforeDrag.current) setLists(listsBeforeDrag.current);
    listsBeforeDrag.current = null;
    setActiveCardId(null);
    setActiveListId(null);
    window.setTimeout(() => { didDrag.current = false; }, 0);
  }

  async function toggleCardComplete(cardId: string) {
    const card = lists.flatMap((list) => list.cards).find((item) => item.id === cardId);
    if (!card) return;
    const previousCompleted = card.completed;
    const completed = !previousCompleted;
    setLists((currentLists) => currentLists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => card.id === cardId
        ? { ...card, completed }
        : card),
    })));
    try { await apiPatch(`/cards/${cardId}`, { completed }); }
    catch (error) {
      setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((item) => item.id === cardId ? { ...item, completed: previousCompleted } : item) })));
      setRequestError(error instanceof Error ? error.message : "Failed to update card");
    }
  }

  async function toggleCardLabel(cardId: string, labelId: string) {
    const previousCard = lists.flatMap((list) => list.cards).find((card) => card.id === cardId);
    const existing = previousCard?.labelIds?.includes(labelId) ?? false;
    setLists((currentLists) => currentLists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => {
        if (card.id !== cardId) return card;
        const currentLabelIds = card.labelIds ?? [];
        const labelIds = currentLabelIds.includes(labelId)
          ? currentLabelIds.filter((id) => id !== labelId)
          : [...currentLabelIds, labelId];
        const primaryLabel = boardLabels.find((item) => labelIds.includes(item.id));
        return {
          ...card,
          labelIds,
          label: primaryLabel?.name ?? "No labels",
          color: primaryLabel?.color ?? "#a0a1aa",
        };
      }),
    })));
    try {
      if (existing) await apiDelete(`/cards/${cardId}/labels/${labelId}`);
      else await apiPut(`/cards/${cardId}/labels/${labelId}`, {});
      setRequestError(null);
    } catch (error) {
      if (previousCard) {
        setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, labelIds: previousCard.labelIds, label: previousCard.label, color: previousCard.color } : card) })));
      }
      setRequestError(error instanceof Error ? error.message : "Failed to update label");
    }
  }

  async function toggleCardMember(cardId: string, memberId: string) {
    const previousMemberIds = lists.flatMap((list) => list.cards).find((card) => card.id === cardId)?.memberIds ?? [];
    const existing = previousMemberIds.includes(memberId);
    setLists((currentLists) => currentLists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => {
        if (card.id !== cardId) return card;
        const currentMemberIds = card.memberIds ?? [];
        const memberIds = currentMemberIds.includes(memberId)
          ? currentMemberIds.filter((id) => id !== memberId)
          : [...currentMemberIds, memberId];
        return { ...card, memberIds };
      }),
    })));
    try {
      if (existing) await apiDelete(`/cards/${cardId}/members/${memberId}`);
      else {
        if (!boardMemberIds.has(memberId)) {
          const member = boardMembers.find((item) => item.id === memberId);
          if (!member) throw new Error("Member not found");
          await apiPost(`/boards/${board.id}/members`, { email: member.email });
          setBoardMemberIds((current) => new Set(current).add(memberId));
        }
        await apiPut(`/cards/${cardId}/members/${memberId}`, {});
      }
      setRequestError(null);
    } catch (error) {
      setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, memberIds: previousMemberIds } : card) })));
      setRequestError(error instanceof Error ? error.message : "Failed to update member");
    }
  }

  async function addCard(listId: string, title: string, atTop = false) {
    try {
      const data = await apiPost<{ card: ApiCard }>(`/lists/${listId}/cards`, { title });
      let creatorId = "";
      try { creatorId = String(JSON.parse(localStorage.getItem("kanvero_user") ?? "null")?.id ?? ""); } catch {}
    const newCard: BoardCardData = {
      id: String(data.card.id),
      creatorId,
      title: data.card.title,
      label: "No labels",
      color: "#a0a1aa",
      labelIds: [],
      memberIds: creatorId ? [creatorId] : [],
    };
    if (atTop) await apiPut(`/cards/${newCard.id}/move`, { listId, position: 0 });
    await refreshBoardLists();
      setRequestError(null);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to add card"); }
  }

  async function addList() {
    const title = newListName.trim();
    if (!title || !board.id) return;
    try {
      const data = await apiPost<{ list: ApiList }>(`/boards/${board.id}/lists`, { title });
      setLists((currentLists) => [...currentLists, { id: String(data.list.id), title: data.list.title, cards: [] }]);
      setNewListName("");
      setAddingList(false);
      setRequestError(null);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to add list"); }
  }

  async function renameList(listId: string, title: string) {
    const previousTitle = lists.find((list) => list.id === listId)?.title;
    setLists((currentLists) => currentLists.map((list) => list.id === listId
      ? { ...list, title }
      : list));
    try { await apiPatch(`/lists/${listId}`, { title }); }
    catch (error) {
      if (previousTitle !== undefined) setLists((currentLists) => currentLists.map((list) => list.id === listId ? { ...list, title: previousTitle } : list));
      setRequestError(error instanceof Error ? error.message : "Failed to rename list");
    }
  }

  async function refreshBoardLists() {
    const data = await apiGet<{ board: ApiBoard }>(`/boards/${board.id}`);
    setLists(data.board.lists.map((list) => ({ id: String(list.id), title: list.title, cards: list.cards.map(mapApiCard) })));
  }

  async function archiveList(listId: string) {
    const previous = lists;
    setLists((current) => current.filter((list) => list.id !== listId));
    try { await apiPatch(`/lists/${listId}`, { archived: true }); setRequestError(null); }
    catch (error) { setLists(previous); setRequestError(error instanceof Error ? error.message : "Failed to archive list"); }
  }

  async function deleteList(listId: string) {
    const previous = lists;
    setLists((current) => current.filter((list) => list.id !== listId));
    try { await apiDelete(`/lists/${listId}`); setRequestError(null); }
    catch (error) { setLists(previous); setRequestError(error instanceof Error ? error.message : "Failed to delete list"); }
  }

  async function copyList(listId: string) {
    try {
      await apiPost(`/lists/${listId}/copy`, {});
      await refreshBoardLists();
      setRequestError(null);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to copy list"); }
  }

  async function moveList(listId: string, direction: -1 | 1) {
    const previous = lists;
    const index = lists.findIndex((list) => list.id === listId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= lists.length) return;
    const next = arrayMove(lists, index, target);
    setLists(next);
    try { await apiPut(`/boards/${board.id}/lists/order`, { listIds: next.map((list) => list.id) }); }
    catch (error) { setLists(previous); setRequestError(error instanceof Error ? error.message : "Failed to move list"); }
  }

  async function sortList(listId: string) {
    const previous = lists;
    const source = lists.find((list) => list.id === listId);
    if (!source) return;
    const sorted = [...source.cards].sort((a, b) => a.title.localeCompare(b.title));
    setLists((current) => current.map((list) => list.id === listId ? { ...list, cards: sorted } : list));
    try {
      for (const [position, card] of sorted.entries()) await apiPut(`/cards/${card.id}/move`, { listId, position });
      setRequestError(null);
    } catch (error) { setLists(previous); setRequestError(error instanceof Error ? error.message : "Failed to sort list"); }
  }

  async function renameCard(cardId: string, title: string) {
    const previousTitle = lists.flatMap((list) => list.cards).find((card) => card.id === cardId)?.title;
    setLists((currentLists) => currentLists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => card.id === cardId ? { ...card, title } : card),
    })));
    try { await apiPatch(`/cards/${cardId}`, { title }); }
    catch (error) {
      if (previousTitle !== undefined) setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, title: previousTitle } : card) })));
      setRequestError(error instanceof Error ? error.message : "Failed to rename card");
    }
  }

  async function copyCard(cardId: string, listId: string) {
    try {
      await apiPost(`/cards/${cardId}/copy`, { listId });
      await refreshBoardLists();
      setRequestError(null);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to copy card"); }
  }

  async function archiveCard(cardId: string) {
    const previous = lists;
    setLists((current) => current.map((list) => ({ ...list, cards: list.cards.filter((card) => card.id !== cardId) })));
    try { await apiPatch(`/cards/${cardId}`, { archived: true }); setRequestError(null); }
    catch (error) { setLists(previous); setRequestError(error instanceof Error ? error.message : "Failed to archive card"); }
  }

  async function deleteCard(cardId: string) {
    const previous = lists;
    setLists((current) => current.map((list) => ({ ...list, cards: list.cards.filter((card) => card.id !== cardId) })));
    try { await apiDelete(`/cards/${cardId}`); setRequestError(null); }
    catch (error) { setLists(previous); setRequestError(error instanceof Error ? error.message : "Failed to delete card"); }
  }

  async function moveCard(cardId: string, targetListId: string, position: number) {
    const previousLists = lists;
    setLists((currentLists) => {
      const nextLists = currentLists.map((list) => ({ ...list, cards: [...list.cards] }));
      const sourceList = nextLists.find((list) => list.cards.some((card) => card.id === cardId));
      const targetList = nextLists.find((list) => list.id === targetListId);
      if (!sourceList || !targetList) return currentLists;

      const sourceCardIndex = sourceList.cards.findIndex((card) => card.id === cardId);
      const [movedCard] = sourceList.cards.splice(sourceCardIndex, 1);
      const targetIndex = Math.max(0, Math.min(position - 1, targetList.cards.length));
      targetList.cards.splice(targetIndex, 0, movedCard);
      return nextLists;
    });
    try { await apiPut(`/cards/${cardId}/move`, { listId: targetListId, position: Math.max(0, position - 1) }); await refreshBoardLists(); }
    catch (error) {
      setLists(previousLists);
      setRequestError(error instanceof Error ? error.message : "Failed to move card");
    }
  }

  async function changeCardCover(cardId: string, update: CardCoverUpdate) {
    const previousCard = lists.flatMap((list) => list.cards).find((card) => card.id === cardId);
    setLists((currentLists) => currentLists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => card.id === cardId ? { ...card, ...update } : card),
    })));
    try { await apiPatch(`/cards/${cardId}`, { coverUrl: update.cover ?? null, coverColor: update.coverColor ?? null, coverSize: update.coverSize ?? "header" }); }
    catch (error) {
      if (previousCard) setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, cover: previousCard.cover, coverColor: previousCard.coverColor, coverSize: previousCard.coverSize } : card) })));
      setRequestError(error instanceof Error ? error.message : "Failed to update cover");
    }
  }

  async function changeCardDates(cardId: string, update: CardDateUpdate) {
    const previousCard = lists.flatMap((list) => list.cards).find((card) => card.id === cardId);
    setLists((currentLists) => currentLists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => card.id === cardId ? { ...card, ...update } : card),
    })));
    try { await apiPatch(`/cards/${cardId}`, { startDate: update.startDate ?? null, dueDate: update.dueDate ?? null, dueTime: update.dueTime ?? null, recurring: update.recurring ?? null, reminder: update.reminder ?? null }); }
    catch (error) {
      if (previousCard) setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, startDate: previousCard.startDate, dueDate: previousCard.dueDate, dueTime: previousCard.dueTime, recurring: previousCard.recurring, reminder: previousCard.reminder } : card) })));
      setRequestError(error instanceof Error ? error.message : "Failed to update dates");
    }
  }

  async function changeCardDescription(cardId: string, description: string) {
    const previousDescription = lists.flatMap((list) => list.cards).find((card) => card.id === cardId)?.description;
    setLists((currentLists) => currentLists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => card.id === cardId ? { ...card, description } : card),
    })));
    try { await apiPatch(`/cards/${cardId}`, { description }); }
    catch (error) {
      setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, description: previousDescription } : card) })));
      setRequestError(error instanceof Error ? error.message : "Failed to update description");
    }
  }

  async function addCardComment(cardId: string, text: string) {
    try {
      const data = await apiPost<{ comment: ApiComment }>(`/cards/${cardId}/comments`, { text });
      const comment = { id: String(data.comment.id), text: data.comment.text, author: data.comment.author?.name ?? "You", createdAt: new Date(data.comment.createdAt).toLocaleString() };
      setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, comments: [...(card.comments ?? []), comment] } : card) })));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to add comment"); }
  }

  function addCardAttachment(cardId: string, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setRequestError("Attachments must be 5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      apiPost<{ attachment: { id: string; name: string; url: string } }>(`/cards/${cardId}/attachments`, { name: file.name, url: reader.result, mimeType: file.type, size: file.size })
        .then(({ attachment }) => setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, attachments: [...(card.attachments ?? []), attachment] } : card) }))))
        .catch((error) => setRequestError(error instanceof Error ? error.message : "Failed to add attachment"));
    });
    reader.readAsDataURL(file);
  }

  async function addCardCustomField(cardId: string, name: string, value: string) {
    try {
      const data = await apiPost<{ customField: { id: string; name: string; value: string } }>(`/cards/${cardId}/custom-fields`, { name, value });
      setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, customFields: [...(card.customFields ?? []), data.customField] } : card) })));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to add custom field"); }
  }

  async function addCardChecklist(cardId: string, title: string) {
    try {
      const data = await apiPost<{ checklist: { id: string; title: string; items: ChecklistItem[] } }>(`/cards/${cardId}/checklists`, { title });
      const checklist: CardChecklist = { id: String(data.checklist.id), title: data.checklist.title, items: data.checklist.items ?? [] };
      setLists((current) => current.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, checklists: [...(card.checklists ?? []), checklist] } : card) })));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to add checklist"); }
  }

  async function deleteCardChecklist(cardId: string, checklistId: string) {
    try {
      await apiDelete(`/checklists/${checklistId}`);
      setLists((current) => current.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, checklists: card.checklists?.filter((checklist) => checklist.id !== checklistId) } : card) })));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to delete checklist"); }
  }

  async function addCardChecklistItem(cardId: string, checklistId: string, title: string) {
    try {
      const data = await apiPost<{ item: ChecklistItem }>(`/checklists/${checklistId}/items`, { title });
      const item = { ...data.item, id: String(data.item.id) };
      setLists((current) => current.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, checklists: card.checklists?.map((checklist) => checklist.id === checklistId ? { ...checklist, items: [...checklist.items, item] } : checklist) } : card) })));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to add checklist item"); }
  }

  async function toggleCardChecklistItem(cardId: string, itemId: string, completed: boolean) {
    const update = (value: boolean) => setLists((current) => current.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, checklists: card.checklists?.map((checklist) => ({ ...checklist, items: checklist.items.map((item) => item.id === itemId ? { ...item, completed: value } : item) })) } : card) })));
    update(completed);
    try { await apiPatch(`/checklist-items/${itemId}`, { completed }); }
    catch (error) { update(!completed); setRequestError(error instanceof Error ? error.message : "Failed to update checklist item"); }
  }

  async function deleteCardChecklistItem(cardId: string, itemId: string) {
    try {
      await apiDelete(`/checklist-items/${itemId}`);
      setLists((current) => current.map((list) => ({ ...list, cards: list.cards.map((card) => card.id === cardId ? { ...card, checklists: card.checklists?.map((checklist) => ({ ...checklist, items: checklist.items.filter((item) => item.id !== itemId) })) } : card) })));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to delete checklist item"); }
  }

  function searchCards() {
    setSearchMessage(hasCardFilters ? `${filteredCardCount} matching card${filteredCardCount === 1 ? "" : "s"}` : "Enter a search or choose a filter");
  }

  async function loadBoardMenuData() {
    if (!board.id) return;
    try {
      const [activityData, archivedData, automationData, powerUpData] = await Promise.all([
        apiGet<{ activities: BoardActivityItem[] }>(`/boards/${board.id}/activity`),
        apiGet<{ lists: ArchivedBoardItem[]; cards: ArchivedBoardItem[] }>(`/boards/${board.id}/archived`),
        apiGet<{ automations: BoardAutomationItem[] }>(`/boards/${board.id}/automations`),
        apiGet<{ powerUps: typeof powerUps }>(`/boards/${board.id}/power-ups`),
      ]);
      setBoardActivities(activityData.activities);
      setArchivedLists(archivedData.lists);
      setArchivedCards(archivedData.cards);
      setAutomations(automationData.automations.map((item) => ({ ...item, id: String(item.id), triggerListId: item.triggerListId ? String(item.triggerListId) : null, actionListId: item.actionListId ? String(item.actionListId) : null })));
      setPowerUps(powerUpData.powerUps);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to load board menu"); }
  }

  async function openBoardMenu() {
    setBoardMenuOpen(true);
    await loadBoardMenuData();
  }

  async function createAutomationRule() {
    const name = automationName.trim();
    if (!name || !canManageBoard) return;
    try {
      const data = await apiPost<{ automation: BoardAutomationItem }>(`/boards/${board.id}/automations`, {
        name,
        triggerType: automationTrigger,
        triggerListId: automationTriggerListId || null,
        actionType: automationAction,
        actionListId: automationAction === "move_to_list" ? automationActionListId || null : null,
      });
      setAutomations((current) => [{ ...data.automation, id: String(data.automation.id), triggerListId: data.automation.triggerListId ? String(data.automation.triggerListId) : null, actionListId: data.automation.actionListId ? String(data.automation.actionListId) : null }, ...current]);
      setAutomationName("");
      setRequestError(null);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to create automation"); }
  }

  async function toggleAutomationRule(rule: BoardAutomationItem) {
    try {
      const data = await apiPatch<{ automation: BoardAutomationItem }>(`/boards/${board.id}/automations/${rule.id}`, { enabled: !rule.enabled });
      setAutomations((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: data.automation.enabled } : item));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to update automation"); }
  }

  async function deleteAutomationRule(id: string) {
    try {
      await apiDelete(`/boards/${board.id}/automations/${id}`);
      setAutomations((current) => current.filter((item) => item.id !== id));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to delete automation"); }
  }

  async function togglePowerUp(key: keyof typeof powerUps) {
    if (!canManageBoard) return;
    const enabled = !powerUps[key];
    try {
      await apiPut(`/boards/${board.id}/power-ups/${key}`, { enabled });
      setPowerUps((current) => ({ ...current, [key]: enabled }));
      if (!enabled && activeBoardView === key) setActiveBoardView("board");
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to update Power-Up"); }
  }

  async function saveBoardDescription() {
    if ((board.description ?? "") === boardDescription.trim()) return;
    try {
      await apiPatch(`/boards/${board.id}`, { description: boardDescription });
      setBoard((current) => ({ ...current, description: boardDescription.trim() || undefined }));
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to update board description"); }
  }

  async function changeBoardVisibility(visibility: "private" | "workspace" | "public") {
    const previous = board.visibility ?? "workspace";
    setBoard((current) => ({ ...current, visibility }));
    try { await apiPatch(`/boards/${board.id}`, { visibility }); }
    catch (error) { setBoard((current) => ({ ...current, visibility: previous })); setRequestError(error instanceof Error ? error.message : "Failed to update board visibility"); }
  }

  async function restoreArchivedItem(kind: "list" | "card", id: string) {
    try {
      await apiPatch(`/${kind === "list" ? "lists" : "cards"}/${id}`, { archived: false });
      await Promise.all([refreshBoardLists(), loadBoardMenuData()]);
    } catch (error) { setRequestError(error instanceof Error ? error.message : `Failed to restore ${kind}`); }
  }

  async function copyBoardLink() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1600);
    } catch {
      setShareCopied(false);
    }
  }

  async function toggleBoardAccess(member: BoardMember) {
    const hasAccess = boardMemberIds.has(member.id);
    setBusyBoardMemberIds((current) => new Set(current).add(member.id));
    setShareError(null);
    try {
      if (hasAccess) {
        await apiDelete(`/boards/${board.id}/members/${member.id}`);
        setBoardMemberIds((current) => { const next = new Set(current); next.delete(member.id); return next; });
        setLists((currentLists) => currentLists.map((list) => ({ ...list, cards: list.cards.map((card) => ({ ...card, memberIds: card.memberIds?.filter((id) => id !== member.id) })) })));
      } else {
        await apiPost(`/boards/${board.id}/members`, { email: member.email });
        setBoardMemberIds((current) => new Set(current).add(member.id));
      }
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Failed to update board access");
    } finally {
      setBusyBoardMemberIds((current) => { const next = new Set(current); next.delete(member.id); return next; });
    }
  }

  function uploadCardCover(cardId: string, file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setRequestError("Cover images must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      changeCardCover(cardId, {
        cover: reader.result,
        coverColor: undefined,
        coverSize: "header",
      });
    });
    reader.readAsDataURL(file);
  }

  function openCardDetails(cardId: string) {
    if (!didDrag.current) {
      setQuickMenuCardId(null);
      setLabelMenuCardId(null);
      setMemberMenuCardId(null);
      setCoverMenuCardId(null);
      setDateMenuCardId(null);
      setMoveMenuCardId(null);
      setQuickMenuPosition(null);
      setSelectedCardId(cardId);
    }
  }

  function openQuickMenu(cardId: string, position: MenuPosition) {
    setLabelMenuCardId(null);
    setMemberMenuCardId(null);
    setCoverMenuCardId(null);
    setDateMenuCardId(null);
    setMoveMenuCardId(null);
    if (quickMenuCardId === cardId) {
      setQuickMenuCardId(null);
      setQuickMenuPosition(null);
    } else {
      setQuickMenuCardId(cardId);
      setQuickMenuPosition(position);
    }
  }

  function openLabelMenu(cardId: string) {
    setMemberMenuCardId(null);
    setCoverMenuCardId(null);
    setDateMenuCardId(null);
    setMoveMenuCardId(null);
    setLabelMenuCardId(cardId);
  }

  function openMemberMenu(cardId: string) {
    setLabelMenuCardId(null);
    setCoverMenuCardId(null);
    setDateMenuCardId(null);
    setMoveMenuCardId(null);
    setMemberMenuCardId(cardId);
  }

  function openCoverMenu(cardId: string) {
    setLabelMenuCardId(null);
    setMemberMenuCardId(null);
    setDateMenuCardId(null);
    setMoveMenuCardId(null);
    setCoverMenuCardId(cardId);
  }

  function openDateMenu(cardId: string) {
    setLabelMenuCardId(null);
    setMemberMenuCardId(null);
    setCoverMenuCardId(null);
    setMoveMenuCardId(null);
    setDateMenuCardId(cardId);
  }

  function openMoveMenu(cardId: string) {
    setLabelMenuCardId(null);
    setMemberMenuCardId(null);
    setCoverMenuCardId(null);
    setDateMenuCardId(null);
    setMoveMenuCardId(cardId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);
    setActiveListId(null);
    window.setTimeout(() => { didDrag.current = false; }, 0);
    if (!canEditBoard) return;
    const { active, over } = event;
    const beforeDrag = listsBeforeDrag.current;

    if (active.data.current?.type === "list") {
      listsBeforeDrag.current = null;
      if (!over || active.id === over.id) return;
      const sourceIndex = lists.findIndex((list) => list.id === active.id);
      const targetIndex = lists.findIndex((list) => list.id === over.id || list.cards.some((card) => card.id === over.id));
      if (sourceIndex < 0 || targetIndex < 0) return;
      const nextLists = arrayMove(lists, sourceIndex, targetIndex);
      setLists(nextLists);
      apiPut(`/boards/${board.id}/lists/order`, { listIds: nextLists.map((list) => list.id) })
        .catch((error) => { setLists(beforeDrag ?? lists); setRequestError(error instanceof Error ? error.message : "Failed to reorder lists"); });
      return;
    }

    if (!over) {
      if (beforeDrag) setLists(beforeDrag);
      listsBeforeDrag.current = null;
      return;
    }

    listsBeforeDrag.current = null;
    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceListIndex = findListIndex(activeId);
    const targetListIndex = findListIndex(overId);

    if (sourceListIndex < 0 || targetListIndex < 0) return;

    const nextLists = lists.map((list) => ({ ...list, cards: [...list.cards] }));
    if (activeId !== overId) {
      const sourceCards = nextLists[sourceListIndex].cards;
      const sourceCardIndex = sourceCards.findIndex((card) => card.id === activeId);
      if (sourceCardIndex < 0) return;

      if (sourceListIndex === targetListIndex && overId !== nextLists[targetListIndex].id) {
        const targetCardIndex = sourceCards.findIndex((card) => card.id === overId);
        if (targetCardIndex < 0) return;
        nextLists[sourceListIndex].cards = arrayMove(sourceCards, sourceCardIndex, targetCardIndex);
      } else if (sourceListIndex !== targetListIndex) {
        const [movedCard] = sourceCards.splice(sourceCardIndex, 1);
        const targetCards = nextLists[targetListIndex].cards;
        const targetCardIndex = targetCards.findIndex((card) => card.id === overId);
        targetCards.splice(targetCardIndex < 0 ? targetCards.length : targetCardIndex, 0, movedCard);
      }
    }

    const destinationList = nextLists.find((list) => list.cards.some((card) => card.id === activeId));
    const destinationPosition = destinationList?.cards.findIndex((card) => card.id === activeId) ?? -1;
    const originalList = beforeDrag?.find((list) => list.cards.some((card) => card.id === activeId));
    const originalPosition = originalList?.cards.findIndex((card) => card.id === activeId) ?? -1;

    if (!destinationList || destinationPosition < 0) {
      if (beforeDrag) setLists(beforeDrag);
      return;
    }
    if (destinationList.id === originalList?.id && destinationPosition === originalPosition) return;

    setLists(nextLists);
    apiPut(`/cards/${activeId}/move`, { listId: destinationList.id, position: destinationPosition })
      .then(() => refreshBoardLists())
      .catch((error) => {
        if (beforeDrag) setLists(beforeDrag);
        setRequestError(error instanceof Error ? error.message : "Failed to move card");
      });
  }

  return (
    <BoardMembersContext.Provider value={boardMembers}>
    <main className={`board-theme relative flex h-dvh flex-col overflow-hidden bg-[#0c66e4] text-white ${powerUps.card_aging ? "card-aging-enabled" : ""}`}>
      {board.cover ? <Image src={board.cover} alt="" fill priority sizes="100vw" className="object-cover" /> : null}
      <div className="absolute inset-0 bg-[#091e42]/20" />

      <header className="relative z-20 flex h-16 shrink-0 items-center border-b border-[#dcdfe4] bg-[#ffffff]/95 px-5 shadow-sm backdrop-blur dark:border-[#454f59] dark:bg-[#1d2125]/95 md:px-10">
        <Link href="/dashboard" aria-label="Back to dashboard" className="flex items-center gap-3">
          <Image src="/image_3-removebg-preview.png" alt="Kanvero" width={230} height={74} priority className="h-auto w-33 dark:brightness-0 dark:invert md:w-38.5" />
        </Link>
        <form onSubmit={(event) => { event.preventDefault(); searchCards(); }} className="relative ml-8 hidden h-10 w-[min(58vw,780px)] items-center md:flex">
          <Icon name="search" size={20} className="absolute left-3 text-[#44546f]" />
          <input value={cardSearch} onChange={(event) => { setCardSearch(event.target.value); setSearchMessage(""); }} type="search" aria-label="Search cards on this board" placeholder="Search cards..." className="h-full w-full rounded-lg border border-[#b7bec8] bg-white pl-10 pr-4 text-sm text-[#172b4d] outline-none transition placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4] dark:border-[#626f86] dark:bg-[#22272b] dark:text-[#f1f2f4]" />
          {searchMessage ? <span role="status" className="absolute left-0 top-11 rounded-md bg-[#2f3040] px-3 py-1.5 text-xs text-white shadow-lg">{searchMessage}</span> : null}
        </form>
        {canEditBoard ? <button type="button" onClick={() => setAddingList(true)} className="ml-2 hidden h-10 rounded-lg bg-[#0c66e4] px-4 text-sm font-medium text-white transition hover:bg-[#0055cc] sm:block">Create</button> : null}
        <div className="ml-auto flex items-center gap-2">
          <Link href="/notifications" aria-label="Notifications" title="Notifications" className="flex h-9 w-9 items-center justify-center rounded-full text-[#464657] transition hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#282e33] dark:hover:text-[#f1f2f4]"><Icon name="bell" size={20} /></Link>
          <button type="button" aria-label="Help" title="Help" onClick={() => setHelpOpen(true)} className="hidden h-9 w-9 items-center justify-center rounded-full text-[#464657] transition hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#282e33] dark:hover:text-[#f1f2f4] sm:flex"><Icon name="help" size={21} /></button>
          <Avatar label={boardMembers[0]?.initials ?? "U"} />
        </div>
      </header>

      <div className="relative z-10 flex min-h-16 shrink-0 items-center border-b border-white/20 bg-white/75 px-4 text-[#172b4d] shadow-sm backdrop-blur-md dark:border-[#454f59] dark:bg-[#22272b]/90 dark:text-[#f1f2f4] md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold md:text-xl">{board.title}</h1>
            <button type="button" aria-label={boardStarred ? "Unstar board" : "Star board"} aria-pressed={boardStarred} title={boardStarred ? "Unstar board" : "Star board"} onClick={toggleBoardStar} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[color,background-color,transform] duration-150 active:scale-90 ${boardStarred ? "bg-[#fff3c4] text-[#d99a00] hover:bg-[#ffeaa0]" : "text-[#5e5f6b] hover:bg-black/10 hover:text-[#0c66e4]"} ${starAnimating ? "scale-125" : "scale-100"}`}><Star size={18} fill={boardStarred ? "currentColor" : "none"} /></button>
            <select aria-label="Board visibility" title="Board visibility" value={board.visibility ?? "workspace"} disabled={!canManageBoard} onChange={(event) => changeBoardVisibility(event.target.value as "private" | "workspace" | "public")} className="hidden h-8 rounded-md border border-[#b7bec8] bg-white/90 px-2 text-xs capitalize text-[#172b4d] outline-none focus:border-[#0c66e4] disabled:cursor-default disabled:opacity-100 dark:border-[#626f86] dark:bg-[#282e33] dark:text-[#f1f2f4] dark:[color-scheme:dark] sm:block"><option value="private">Private</option><option value="workspace">Workspace</option><option value="public">Public</option></select>
          </div>
          <p className="hidden text-xs text-[#44546f] dark:text-[#b6c2cf] sm:block">{board.workspace}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden -space-x-2 sm:flex">{boardMembers.filter((member) => boardMemberIds.has(member.id)).slice(0, 3).map((member) => <Avatar key={member.id} label={member.initials} />)}</div>
          <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-pressed={hasCardFilters} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${hasCardFilters ? "bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c3d5d] dark:text-[#85b8ff]" : "bg-white/70 text-[#44546f] hover:bg-white dark:bg-[#3b444c] dark:text-[#b6c2cf] dark:hover:bg-[#454f59]"}`}><ListFilter size={16} /><span className="hidden sm:inline">Filter</span>{hasCardFilters ? <span className="rounded-full bg-[#0c66e4] px-1.5 text-[10px] text-white">{filteredCardCount}</span> : null}</button>
          <button type="button" onClick={() => { setShareError(null); setShareOpen(true); }} className="flex h-9 items-center gap-2 rounded-lg bg-[#0c66e4] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0055cc]"><Link2 size={16} /> <span className="hidden sm:inline">Share</span></button>
          <button type="button" onClick={openBoardMenu} aria-label="Open board menu" title="Board menu" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-[#44546f] hover:bg-white dark:bg-[#3b444c] dark:text-[#b6c2cf] dark:hover:bg-[#454f59]"><MoreHorizontal size={19} /></button>
        </div>
      </div>

      {!canEditBoard ? <div className="relative z-10 border-b border-[#7f5f01] bg-[#fff7d6] px-4 py-2 text-center text-xs font-medium text-[#533f04] dark:bg-[#332e1b] dark:text-[#f5cd47]">View only — join this board&apos;s workspace to make changes.</div> : null}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
        <div className={`board-scrollbar relative z-10 min-h-0 flex-1 p-4 pb-20 md:p-5 md:pb-20 ${activeBoardView === "board" ? "flex items-start gap-4 overflow-x-auto overflow-y-hidden" : "overflow-auto"}`}>
          {activeBoardView === "board" ? <>
          <SortableContext items={lists.map((list) => list.id)} strategy={horizontalListSortingStrategy}>
            {filteredLists.map((list) => <BoardList key={list.id} list={list} lists={lists} labels={boardLabels} canEdit={canEditBoard} onAddCard={addCard} onRenameList={renameList} onArchiveList={archiveList} onDeleteList={deleteList} onCopyList={copyList} onMoveList={moveList} onSortList={sortList} onToggleComplete={toggleCardComplete} onToggleLabel={toggleCardLabel} onToggleMember={toggleCardMember} onChangeCover={changeCardCover} onUploadCover={uploadCardCover} onChangeDates={changeCardDates} onMoveCard={moveCard} onOpenCard={openCardDetails} quickMenuCardId={quickMenuCardId} labelMenuCardId={labelMenuCardId} memberMenuCardId={memberMenuCardId} coverMenuCardId={coverMenuCardId} dateMenuCardId={dateMenuCardId} moveMenuCardId={moveMenuCardId} quickMenuPosition={quickMenuPosition} onQuickEdit={openQuickMenu} onOpenLabelMenu={openLabelMenu} onOpenMemberMenu={openMemberMenu} onOpenCoverMenu={openCoverMenu} onOpenDateMenu={openDateMenu} onOpenMoveMenu={openMoveMenu} onCloseLabelMenu={() => setLabelMenuCardId(null)} onCloseMemberMenu={() => setMemberMenuCardId(null)} onCloseCoverMenu={() => setCoverMenuCardId(null)} onCloseDateMenu={() => setDateMenuCardId(null)} onCloseMoveMenu={() => setMoveMenuCardId(null)} onCloseQuickMenu={() => { setQuickMenuCardId(null); setLabelMenuCardId(null); setMemberMenuCardId(null); setCoverMenuCardId(null); setDateMenuCardId(null); setMoveMenuCardId(null); setQuickMenuPosition(null); }} onOpenLabelEditor={(label, position) => { setLabelEditor(label); setLabelEditorPosition(position); }} />)}
          </SortableContext>
          {canEditBoard && addingList ? (
            <form onSubmit={(event) => { event.preventDefault(); addList(); }} className="w-71.5 shrink-0 rounded-xl border border-white/30 bg-[#f1f2f4]/95 p-3 text-[#172b4d] shadow-lg backdrop-blur-md dark:border-[#454f59] dark:bg-[#101214]/95 dark:text-[#f1f2f4]">
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setAddingList(false);
                    setNewListName("");
                  }
                }}
                autoFocus
                placeholder="Enter list name..."
                className="h-10 w-full rounded-lg border border-[#b7bec8] bg-white px-3 text-sm font-semibold text-[#172b4d] outline-none placeholder:font-medium placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/15"
              />
              <div className="mt-2 flex items-center gap-2">
                <button type="submit" disabled={!newListName.trim()} className="h-9 rounded-lg bg-[#0c66e4] px-4 text-sm font-semibold text-white transition hover:bg-[#0055cc] disabled:cursor-not-allowed disabled:opacity-45">Add list</button>
                <button type="button" aria-label="Close add list" title="Close" onClick={() => { setAddingList(false); setNewListName(""); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#44546f] transition hover:bg-black/10 hover:text-[#172b4d]"><X size={19} /></button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setAddingList(true)} className="flex h-12 w-71.5 shrink-0 items-center gap-2 rounded-xl border border-white/30 bg-white/75 px-4 text-sm font-semibold text-[#2f3040] shadow-lg backdrop-blur-md transition hover:bg-white/90 dark:border-[#454f59] dark:bg-[#282e33]/95 dark:text-[#f1f2f4] dark:hover:bg-[#3b444c]">
              <Icon name="plus" size={18} /> Add another list
            </button>
          )}
          </> : null}

          {activeBoardView === "table" ? <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-[#dcdfe4] bg-white text-[#172b4d] shadow-xl dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#f1f2f4]">
            <header className="border-b border-[#dcdfe4] px-5 py-4 dark:border-[#454f59]"><h2 className="text-lg font-semibold">Table view</h2><p className="text-sm text-[#626f86] dark:text-[#9fadbc]">Review every visible card in one sortable-style list.</p></header>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="bg-[#f7f8f9] text-xs uppercase text-[#626f86] dark:bg-[#282e33] dark:text-[#9fadbc]"><tr><th className="px-4 py-3">Card</th><th className="px-4 py-3">List</th><th className="px-4 py-3">Labels</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{viewCards.map(({ card, list }) => <tr key={card.id} onClick={() => openCardDetails(card.id)} className="cursor-pointer border-t border-[#dcdfe4] hover:bg-[#f7f8f9] dark:border-[#454f59] dark:hover:bg-[#282e33]"><td className="px-4 py-3 font-semibold">{card.title}</td><td className="px-4 py-3">{list.title}</td><td className="px-4 py-3"><span className="inline-flex rounded px-2 py-1 text-xs text-white" style={{ backgroundColor: card.color }}>{card.label}</span></td><td className="px-4 py-3">{card.memberIds?.length ?? 0}</td><td className="px-4 py-3">{card.dueDate ? new Date(`${card.dueDate}T00:00:00`).toLocaleDateString() : "—"}</td><td className="px-4 py-3">{card.completed ? "Complete" : "Open"}</td></tr>)}{!viewCards.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[#626f86] dark:text-[#9fadbc]">No cards match the current filters.</td></tr> : null}</tbody></table></div>
          </section> : null}

          {activeBoardView === "calendar" ? <section className="mx-auto w-full max-w-6xl rounded-xl border border-[#dcdfe4] bg-white p-5 text-[#172b4d] shadow-xl dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#f1f2f4]">
            <header className="mb-5"><h2 className="text-lg font-semibold">Calendar view</h2><p className="text-sm text-[#626f86] dark:text-[#9fadbc]">Cards are grouped by due date. Open a card to change its date.</p></header>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{calendarGroups.map(([date, items]) => <section key={date} className="overflow-hidden rounded-lg border border-[#dcdfe4] dark:border-[#454f59]"><h3 className="border-b border-[#dcdfe4] bg-[#f7f8f9] px-4 py-3 text-sm font-semibold dark:border-[#454f59] dark:bg-[#282e33]">{date === "Unscheduled" ? date : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</h3><div className="space-y-2 p-3">{items.map(({ card, list }) => <button key={card.id} type="button" onClick={() => openCardDetails(card.id)} className="block w-full rounded-md border border-[#dcdfe4] bg-white p-3 text-left shadow-sm hover:border-[#0c66e4] dark:border-[#454f59] dark:bg-[#1d2125]"><span className="block text-sm font-semibold">{card.title}</span><span className="mt-1 block text-xs text-[#626f86] dark:text-[#9fadbc]">{list.title}{card.dueTime ? ` · ${card.dueTime}` : ""}</span></button>)}</div></section>)}{!calendarGroups.length ? <p className="col-span-full py-12 text-center text-sm text-[#626f86] dark:text-[#9fadbc]">No cards match the current filters.</p> : null}</div>
          </section> : null}
        </div>

        {labelEditor ? (
          <LabelEditorModal
            initialLabel={labelEditor}
          position={labelEditorPosition}
            onClose={() => { setLabelEditor(null); setLabelEditorPosition(null); }}
            onSave={async (nextLabel) => {
              try {
                const existing = boardLabels.some((item) => item.id === nextLabel.id);
                const data = existing
                  ? await apiPatch<{ label: ApiLabel }>(`/labels/${nextLabel.id}`, { name: nextLabel.name, color: nextLabel.color })
                  : await apiPost<{ label: ApiLabel }>(`/boards/${board.id}/labels`, { name: nextLabel.name, color: nextLabel.color });
                setBoardLabels((current) => existing ? current.map((item) => item.id === nextLabel.id ? { id: String(data.label.id), name: data.label.name, color: data.label.color } : item) : [...current, { id: String(data.label.id), name: data.label.name, color: data.label.color }]);
                setLabelEditor(null);
                setLabelEditorPosition(null);
              } catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to save label"); }
            }}
            onDelete={async (labelId) => {
              try { await apiDelete(`/labels/${labelId}`); }
              catch (error) { setRequestError(error instanceof Error ? error.message : "Failed to delete label"); return; }
              setBoardLabels((current) => current.filter((label) => label.id !== labelId));
              setLists((currentLists) => currentLists.map((list) => ({
                ...list,
                cards: list.cards.map((card) => {
                  if (!card.labelIds?.includes(labelId)) return card;
                  const labelIds = card.labelIds.filter((id) => id !== labelId);
                  const nextLabel = boardLabels.find((label) => labelIds.includes(label.id));
                  return {
                    ...card,
                    labelIds,
                    label: nextLabel?.name ?? "No labels",
                    color: nextLabel?.color ?? "#a0a1aa",
                  };
                }),
              })));
              setLabelEditor(null);
              setLabelEditorPosition(null);
            }}
          />
        ) : null}
        <DragOverlay dropAnimation={null}>
          {activeCard ? <div className="w-65.5 rotate-2 cursor-grabbing opacity-95"><CardContent {...activeCard} labels={boardLabels} /></div> : activeList ? (
            <div className="grid max-h-[calc(100dvh-190px)] w-71.5 rotate-1 cursor-grabbing grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-white/50 bg-[#f1f2f4] p-3 text-[#2b2c35] opacity-95 shadow-2xl dark:border-[#454f59] dark:bg-[#101214] dark:text-[#f1f2f4]">
              <h2 className="mb-3 h-8 px-1 py-1.5 text-sm font-semibold">{activeList.title}</h2>
              <div className="min-h-0 space-y-2.5 overflow-hidden">
                {activeList.cards.map((card) => <CardContent key={card.id} {...card} labels={boardLabels} />)}
              </div>
              <div className="mt-3 flex h-9 items-center gap-2 px-2 text-sm font-medium text-[#44546f] dark:text-[#b6c2cf]"><Icon name="plus" size={17} /> Add a card</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <nav aria-label="Board views" className="absolute bottom-4 left-1/2 z-20 flex h-12 -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-[#172b4d]/95 p-1.5 text-xs font-medium text-white/75 shadow-2xl backdrop-blur md:text-sm">
        <button type="button" aria-current={activeBoardView === "board" ? "page" : undefined} onClick={() => setActiveBoardView("board")} className={`flex h-9 items-center gap-2 rounded-lg px-3 ${activeBoardView === "board" ? "bg-[#0c66e4] text-white" : "hover:bg-white/10"}`}><Icon name="grid" size={17} /> Board</button>
        {powerUps.table ? <button type="button" aria-current={activeBoardView === "table" ? "page" : undefined} onClick={() => setActiveBoardView("table")} className={`flex h-9 items-center gap-2 rounded-lg px-3 ${activeBoardView === "table" ? "bg-[#0c66e4] text-white" : "hover:bg-white/10"}`}><Table2 size={17} /> <span className="hidden sm:inline">Table</span></button> : null}
        {powerUps.calendar ? <button type="button" aria-current={activeBoardView === "calendar" ? "page" : undefined} onClick={() => setActiveBoardView("calendar")} className={`flex h-9 items-center gap-2 rounded-lg px-3 ${activeBoardView === "calendar" ? "bg-[#0c66e4] text-white" : "hover:bg-white/10"}`}><CalendarDays size={17} /> <span className="hidden sm:inline">Calendar</span></button> : null}
        <div className="relative">
          <button type="button" aria-expanded={boardSwitcherOpen} aria-haspopup="dialog" onClick={() => { setBoardSearch(""); setBoardSwitcherOpen((open) => !open); }} className={`flex h-9 items-center gap-2 rounded-lg px-3 transition ${boardSwitcherOpen ? "bg-white/12 text-white" : "hover:bg-white/10"}`}><Icon name="tasks" size={17} /> Switch boards</button>
        </div>
      </nav>

      {boardSwitcherOpen ? createPortal(
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-[#172b4d]/35 p-3 backdrop-blur-sm" onPointerDown={(event) => { if (event.target === event.currentTarget && !boardSwitcherPinned) setBoardSwitcherOpen(false); }}>
          <section ref={switcherDialogRef} role="dialog" aria-modal="true" aria-label="Switch boards" className="flex h-[min(750px,calc(100dvh-24px))] w-[min(670px,calc(100vw-24px))] flex-col overflow-hidden rounded-[18px] border border-[#dcdfe4] bg-[#f4f5f7] px-6 py-7 text-[#44546f] shadow-[0_28px_80px_rgba(9,30,66,0.28)] dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#b6c2cf] sm:px-7">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#626f86] dark:text-[#9fadbc]" />
                <input value={boardSearch} onChange={(event) => setBoardSearch(event.target.value)} autoFocus type="search" placeholder="Search your boards" className="h-10 w-full rounded-lg border border-[#8590a2] bg-white pl-10 pr-3 text-sm text-[#172b4d] outline-none placeholder:text-[#626f86] focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4] dark:border-[#738496] dark:bg-[#1d2125] dark:text-[#f1f2f4] dark:placeholder:text-[#9fadbc]" />
              </div>
              <button type="button" aria-label={boardListView ? "Use board tiles" : "Use board list"} title={boardListView ? "Board tiles" : "Board list"} onClick={() => setBoardListView((listView) => !listView)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${boardListView ? "border-[#0c66e4] bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c3d5d] dark:text-[#85b8ff]" : "border-[#b7bec8] bg-white text-[#44546f] hover:bg-[#e9ebf0] dark:border-[#738496] dark:bg-[#1d2125] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]"}`}><ListFilter size={19} /></button>
              <button type="button" aria-label={boardSwitcherPinned ? "Unpin board switcher" : "Pin board switcher"} aria-pressed={boardSwitcherPinned} title={boardSwitcherPinned ? "Unpin" : "Pin"} onClick={() => setBoardSwitcherPinned((pinned) => !pinned)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${boardSwitcherPinned ? "border-[#0c66e4] bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c3d5d] dark:text-[#85b8ff]" : "border-[#b7bec8] bg-white text-[#44546f] hover:bg-[#e9ebf0] dark:border-[#738496] dark:bg-[#1d2125] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]"}`}><Pin size={18} fill={boardSwitcherPinned ? "currentColor" : "none"} /></button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button type="button" onClick={() => setBoardScope("all")} className={`h-7 rounded-md border px-2.5 transition-colors ${boardScope === "all" ? "border-[#0c66e4] bg-[#0c66e4] text-white" : "border-[#b7bec8] bg-white text-[#44546f] hover:bg-[#e9ebf0] dark:border-[#738496] dark:bg-[#1d2125] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]"}`}>All</button>
              <button type="button" onClick={() => { setBoardScope("workspace"); setWorkspaceBoardsOpen(true); }} className={`h-7 max-w-full truncate rounded-md border px-2.5 transition-colors ${boardScope === "workspace" ? "border-[#0c66e4] bg-[#0c66e4] text-white" : "border-[#b7bec8] bg-white text-[#44546f] hover:bg-[#e9ebf0] dark:border-[#738496] dark:bg-[#1d2125] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]"}`}>{board.workspace}</button>
            </div>

            <div className="board-list-scrollbar mt-7 min-h-0 flex-1 overflow-y-auto pr-1">
              {boardScope === "all" ? (
                <>
                  <div className="flex items-center gap-2 px-2 text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]"><Clock3 size={18} /> Recent</div>
                  <div className="mt-4">{renderBoardSwitcherBoards(visibleBoards)}</div>
                </>
              ) : null}

              <button type="button" aria-expanded={workspaceBoardsOpen} onClick={() => setWorkspaceBoardsOpen((open) => !open)} className={`${boardScope === "all" ? "mt-7" : "mt-1"} flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold text-[#44546f] transition-colors hover:bg-[#e9ebf0] dark:text-[#b6c2cf] dark:hover:bg-[#3b444c]`}>
                <span className={`transition-transform ${workspaceBoardsOpen ? "rotate-90" : ""}`}><Icon name="chevron-right" size={18} /></span> {board.workspace}
              </button>
              {workspaceBoardsOpen ? <div className="mt-3 pl-8">{renderBoardSwitcherBoards(workspaceBoards)}</div> : null}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}

      {helpOpen ? createPortal(
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-[#172b4d]/35 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
          <section ref={helpDialogRef} role="dialog" aria-modal="true" aria-labelledby="board-help-title" className="w-full max-w-md rounded-xl border border-[#d8dbe2] bg-white p-5 text-[#172b4d] shadow-2xl">
            <header className="flex items-center justify-between"><h2 id="board-help-title" className="text-lg font-semibold">Board help</h2><button type="button" aria-label="Close help" onClick={() => setHelpOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#e9ebf0]"><X size={18} /></button></header>
            <div className="mt-4 space-y-3 text-sm text-[#44546f]"><p>Drag cards between lists and drag a list by its header to reorder it.</p><p>Use the pencil on a card for labels, members, covers, dates, moving, and copying its link.</p><p>Click a card or list title to rename it.</p></div>
          </section>
        </div>, document.body,
      ) : null}

      {boardMenuOpen ? createPortal(<div className="fixed inset-0 z-120 bg-[#091e42]/20" onPointerDown={(event) => { if (event.target === event.currentTarget) setBoardMenuOpen(false); }}><aside role="dialog" aria-modal="true" aria-labelledby="board-menu-title" className="absolute bottom-0 right-0 top-[52px] flex w-[min(440px,100vw)] flex-col border-l border-[#dcdfe4] bg-white text-[#172b4d] shadow-2xl dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#b6c2cf]"><header className="flex h-14 items-center border-b border-[#dcdfe4] px-4 dark:border-[#454f59]"><h2 id="board-menu-title" className="flex-1 text-center font-semibold">Board menu</h2><button type="button" aria-label="Close board menu" onClick={() => setBoardMenuOpen(false)} className="rounded p-2 hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]"><X size={19} /></button></header><nav className="flex overflow-x-auto border-b border-[#dcdfe4] p-2 dark:border-[#454f59]" aria-label="Board menu sections">{(["about", "activity", "automation", "power-ups", "archived"] as const).map((tab) => <button key={tab} type="button" onClick={() => setBoardMenuTab(tab)} className={`shrink-0 rounded-md px-2.5 py-2 text-xs font-semibold capitalize ${boardMenuTab === tab ? "bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c3d5d] dark:text-[#85b8ff]" : "hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]"}`}>{tab}</button>)}</nav><div className="min-h-0 flex-1 overflow-y-auto p-5">
        {boardMenuTab === "about" ? <section><h3 className="font-semibold">About this board</h3><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">{board.workspace}</p><label className="mt-5 block text-sm font-semibold">Description<textarea value={boardDescription} onChange={(event) => setBoardDescription(event.target.value)} onBlur={saveBoardDescription} placeholder="Add a board description" className="mt-2 min-h-32 w-full resize-y rounded-lg border border-[#b7bec8] bg-white p-3 font-normal outline-none focus:border-[#0c66e4] dark:border-[#738496] dark:bg-[#282e33]" /></label><div className="mt-5 rounded-lg bg-[#f1f2f4] p-4 text-sm dark:bg-[#282e33]"><p className="font-semibold">Board permissions</p><p className="mt-1 text-[#626f86] dark:text-[#9fadbc]">Board members can view and edit cards. Workspace and board administrators manage access.</p></div></section> : null}
        {boardMenuTab === "activity" ? <section><h3 className="font-semibold">Activity</h3><div className="mt-4 space-y-4">{boardActivities.map((activity) => <div key={activity.id} className="flex gap-3"><Avatar label={activity.actor?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "U"} /><div className="min-w-0 text-sm"><p><span className="font-semibold">{activity.actor?.name ?? "A member"}</span> {activity.message}</p><time className="mt-1 block text-xs text-[#626f86] dark:text-[#9fadbc]">{new Date(activity.createdAt).toLocaleString()}</time></div></div>)}{boardActivities.length === 0 ? <p className="text-sm text-[#626f86] dark:text-[#9fadbc]">No recorded activity yet.</p> : null}</div></section> : null}
        {boardMenuTab === "automation" ? <section><h3 className="font-semibold">Automation</h3><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">Run an action automatically when a card is created or moved.</p>{canManageBoard ? <div className="mt-5 space-y-3 rounded-lg border border-[#dcdfe4] p-4 dark:border-[#454f59]"><label className="block text-xs font-semibold">Rule name<input value={automationName} onChange={(event) => setAutomationName(event.target.value)} placeholder="Complete cards moved to Done" className="mt-1.5 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm font-normal dark:border-[#626f86] dark:bg-[#282e33]" /></label><label className="block text-xs font-semibold">When<select value={automationTrigger} onChange={(event) => setAutomationTrigger(event.target.value as typeof automationTrigger)} className="mt-1.5 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm font-normal dark:border-[#626f86] dark:bg-[#282e33]"><option value="card_created">A card is created</option><option value="card_moved">A card is moved</option></select></label><label className="block text-xs font-semibold">In list (optional)<select value={automationTriggerListId} onChange={(event) => setAutomationTriggerListId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm font-normal dark:border-[#626f86] dark:bg-[#282e33]"><option value="">Any list</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</select></label><label className="block text-xs font-semibold">Then<select value={automationAction} onChange={(event) => setAutomationAction(event.target.value as typeof automationAction)} className="mt-1.5 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm font-normal dark:border-[#626f86] dark:bg-[#282e33]"><option value="mark_complete">Mark the card complete</option><option value="move_to_list">Move the card to a list</option></select></label>{automationAction === "move_to_list" ? <label className="block text-xs font-semibold">Destination list<select value={automationActionListId} onChange={(event) => setAutomationActionListId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm font-normal dark:border-[#626f86] dark:bg-[#282e33]"><option value="">Choose a list</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</select></label> : null}<button type="button" onClick={createAutomationRule} disabled={!automationName.trim() || automationAction === "move_to_list" && !automationActionListId} className="h-10 w-full rounded-md bg-[#0c66e4] text-sm font-semibold text-white disabled:opacity-45">Add automation</button></div> : <p className="mt-4 text-sm text-[#626f86] dark:text-[#9fadbc]">Only board administrators can manage automation.</p>}<div className="mt-5 space-y-2">{automations.map((rule) => <div key={rule.id} className="rounded-lg border border-[#dcdfe4] p-3 dark:border-[#454f59]"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-semibold">{rule.name}</p><p className="mt-1 text-xs text-[#626f86] dark:text-[#9fadbc]">{rule.triggerType === "card_created" ? "Card created" : "Card moved"}{rule.triggerListId ? ` in ${lists.find((list) => list.id === rule.triggerListId)?.title ?? "a list"}` : " in any list"} → {rule.actionType === "mark_complete" ? "mark complete" : `move to ${lists.find((list) => list.id === rule.actionListId)?.title ?? "list"}`}</p></div>{canManageBoard ? <><button type="button" onClick={() => toggleAutomationRule(rule)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.enabled ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" : "bg-[#e9ebf0] text-[#626f86] dark:bg-[#3b444c] dark:text-[#9fadbc]"}`}>{rule.enabled ? "On" : "Off"}</button><button type="button" aria-label={`Delete ${rule.name}`} onClick={() => deleteAutomationRule(rule.id)} className="rounded p-1.5 text-[#c9372c] hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 size={16} /></button></> : null}</div></div>)}{!automations.length ? <p className="py-5 text-center text-sm text-[#626f86] dark:text-[#9fadbc]">No automation rules yet.</p> : null}</div></section> : null}
        {boardMenuTab === "power-ups" ? <section><h3 className="font-semibold">Power-Ups</h3><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">Add focused capabilities to this board.</p><div className="mt-5 space-y-3">{([{ key: "calendar", title: "Calendar", description: "Group cards by due date." }, { key: "table", title: "Table", description: "Review cards in a compact table." }, { key: "card_aging", title: "Card Aging", description: "Fade cards with no updates for seven days." }] as const).map((item) => <div key={item.key} className="flex items-center gap-3 rounded-lg border border-[#dcdfe4] p-4 dark:border-[#454f59]"><div className="min-w-0 flex-1"><h4 className="font-semibold">{item.title}</h4><p className="mt-1 text-xs text-[#626f86] dark:text-[#9fadbc]">{item.description}</p></div><button type="button" onClick={() => togglePowerUp(item.key)} disabled={!canManageBoard} aria-pressed={powerUps[item.key]} className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${powerUps[item.key] ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" : "bg-[#e9ebf0] text-[#626f86] dark:bg-[#3b444c] dark:text-[#9fadbc]"}`}>{powerUps[item.key] ? "Enabled" : "Disabled"}</button></div>)}</div>{!canManageBoard ? <p className="mt-4 text-xs text-[#626f86] dark:text-[#9fadbc]">Only board administrators can change Power-Ups.</p> : null}</section> : null}
        {boardMenuTab === "archived" ? <section><h3 className="font-semibold">Archived items</h3><h4 className="mt-5 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Cards</h4><div className="mt-2 space-y-2">{archivedCards.map((card) => <div key={card.id} className="flex items-center gap-2 rounded-lg border border-[#dcdfe4] p-3 dark:border-[#454f59]"><span className="min-w-0 flex-1 truncate text-sm">{card.title}</span><button type="button" onClick={() => restoreArchivedItem("card", card.id)} className="text-sm font-semibold text-[#0c66e4] dark:text-[#579dff]">Restore</button></div>)}{archivedCards.length === 0 ? <p className="text-sm text-[#626f86] dark:text-[#9fadbc]">No archived cards.</p> : null}</div><h4 className="mt-6 text-xs font-semibold uppercase text-[#626f86] dark:text-[#9fadbc]">Lists</h4><div className="mt-2 space-y-2">{archivedLists.map((list) => <div key={list.id} className="flex items-center gap-2 rounded-lg border border-[#dcdfe4] p-3 dark:border-[#454f59]"><span className="min-w-0 flex-1 truncate text-sm">{list.title}</span><button type="button" onClick={() => restoreArchivedItem("list", list.id)} className="text-sm font-semibold text-[#0c66e4] dark:text-[#579dff]">Restore</button></div>)}{archivedLists.length === 0 ? <p className="text-sm text-[#626f86] dark:text-[#9fadbc]">No archived lists.</p> : null}</div></section> : null}
      </div></aside></div>, document.body) : null}

      {filterOpen ? createPortal(<div className="fixed inset-0 z-110" onPointerDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}><aside role="dialog" aria-modal="true" aria-labelledby="filter-title" className="absolute right-4 top-[126px] w-[min(360px,calc(100vw-32px))] rounded-xl border border-[#dcdfe4] bg-white p-4 text-[#172b4d] shadow-2xl dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#b6c2cf]"><header className="flex items-center justify-between"><h2 id="filter-title" className="font-semibold">Filter cards</h2><button type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)} className="rounded p-1.5 hover:bg-[#e9ebf0] dark:hover:bg-[#3b444c]"><X size={18} /></button></header><label className="mt-4 block text-xs font-semibold">Member<select value={filterMemberId} onChange={(event) => setFilterMemberId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm dark:border-[#738496] dark:bg-[#22272b]"><option value="">Anyone</option>{boardMembers.filter((member) => boardMemberIds.has(member.id)).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label className="mt-4 block text-xs font-semibold">Label<select value={filterLabelId} onChange={(event) => setFilterLabelId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm dark:border-[#738496] dark:bg-[#22272b]"><option value="">Any label</option>{boardLabels.map((label) => <option key={label.id} value={label.id}>{label.name || "Unnamed label"}</option>)}</select></label><label className="mt-4 block text-xs font-semibold">Due date<select value={filterDue} onChange={(event) => setFilterDue(event.target.value as typeof filterDue)} className="mt-2 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm dark:border-[#738496] dark:bg-[#22272b]"><option value="all">Any date</option><option value="overdue">Overdue</option><option value="week">Due in the next week</option><option value="none">No due date</option></select></label><button type="button" onClick={() => { setCardSearch(""); setFilterMemberId(""); setFilterLabelId(""); setFilterDue("all"); setSearchMessage(""); }} disabled={!hasCardFilters} className="mt-5 h-10 w-full rounded-md bg-[#091e420f] text-sm font-semibold disabled:opacity-45 dark:bg-[#a1bdd914]">Clear filters</button></aside></div>, document.body) : null}

      {shareOpen ? createPortal(<BoardShareDialog workspaceId={board.workspaceId} members={boardMembers} boardMemberIds={boardMemberIds} ownerId={boardOwnerId} workspaceOwnerId={workspaceOwnerId} canManage={canManageBoard} busyMemberIds={busyBoardMemberIds} error={shareError} linkCopied={shareCopied} onToggleMember={toggleBoardAccess} onCopyLink={copyBoardLink} onClose={() => setShareOpen(false)} />, document.body) : null}

      {requestError ? <div role="alert" className="fixed bottom-20 right-4 z-130 max-w-sm rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-xl">{requestError}</div> : null}
      {selectedCard && selectedList ? canEditBoard ? <CardDetailModal card={selectedCard} currentList={selectedList} lists={lists} labels={boardLabels} onClose={() => setSelectedCardId(null)} onToggleComplete={toggleCardComplete} onToggleLabel={toggleCardLabel} onToggleMember={toggleCardMember} onRenameCard={renameCard} onMoveCard={moveCard} onChangeCover={changeCardCover} onUploadCover={uploadCardCover} onChangeDates={changeCardDates} onChangeDescription={changeCardDescription} onAddComment={addCardComment} onAddAttachment={addCardAttachment} onAddCustomField={addCardCustomField} onAddChecklist={addCardChecklist} onDeleteChecklist={deleteCardChecklist} onAddChecklistItem={addCardChecklistItem} onToggleChecklistItem={toggleCardChecklistItem} onDeleteChecklistItem={deleteCardChecklistItem} onCopyCard={copyCard} onArchiveCard={archiveCard} onDeleteCard={deleteCard} onOpenLabelEditor={(label, position) => { setLabelEditor(label); setLabelEditorPosition(position); }} /> : <ReadOnlyCardModal card={selectedCard} currentList={selectedList} labels={boardLabels} onClose={() => setSelectedCardId(null)} /> : null}
    </main>
    </BoardMembersContext.Provider>
  );
}

