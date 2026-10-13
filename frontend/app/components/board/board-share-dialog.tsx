"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Link2, X } from "lucide-react";
import { useDialogFocus } from "../use-dialog-focus";

export type ShareMember = {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
};

type BoardShareDialogProps = {
  workspaceId: string;
  members: ShareMember[];
  boardMemberIds: Set<string>;
  ownerId: string;
  workspaceOwnerId: string;
  canManage: boolean;
  busyMemberIds: Set<string>;
  error: string | null;
  linkCopied: boolean;
  onToggleMember: (member: ShareMember) => void;
  onCopyLink: () => void;
  onClose: () => void;
};

export function BoardShareDialog({ workspaceId, members, boardMemberIds, ownerId, workspaceOwnerId, canManage, busyMemberIds, error, linkCopied, onToggleMember, onCopyLink, onClose }: BoardShareDialogProps) {
  const dialogRef = useDialogFocus<HTMLElement>(true);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-[#172b4d]/50 p-4 backdrop-blur-[2px]" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="share-board-title" className="max-h-[min(680px,calc(100dvh-32px))] w-full max-w-md overflow-y-auto rounded-xl border border-[#dfe1e6] bg-white p-5 text-[#172b4d] shadow-2xl dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4]">
        <header className="flex items-center justify-between">
          <div><h2 id="share-board-title" className="text-lg font-semibold">Share board</h2><p className="mt-1 text-xs text-[#626f86]">Only workspace members can be given access.</p></div>
          <button type="button" aria-label="Close share board" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#091e420f]"><X size={18} /></button>
        </header>

        <button type="button" onClick={onCopyLink} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#8590a2] text-sm font-semibold text-[#44546f] hover:bg-[#091e420f]"><Link2 size={16} />{linkCopied ? "Link copied" : "Copy board link"}</button>
        <p className="mt-2 text-xs text-[#626f86]">The link does not grant access. The person must also be added below.</p>

        {error ? <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

        <div className="mt-5 border-t border-[#dfe1e6] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#626f86]">Workspace members</h3>
          <div className="mt-2 space-y-1">
            {members.map((member) => {
              const hasAccess = boardMemberIds.has(member.id);
              const isOwner = member.id === ownerId;
              const isWorkspaceOwner = member.id === workspaceOwnerId;
              const busy = busyMemberIds.has(member.id);
              return <div key={member.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-[#f4f5f7]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#172b4d] ${member.color}`}>{member.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{member.name}</span><span className="block truncate text-xs text-[#626f86]">{member.email}</span></span>{isOwner || isWorkspaceOwner ? <span className="rounded bg-[#e9f2ff] px-2 py-1 text-xs font-semibold text-[#0c66e4]">{isOwner ? "Owner" : "Workspace owner"}</span> : <button type="button" disabled={!canManage || busy} onClick={() => onToggleMember(member)} className={`min-w-18 rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${hasAccess ? "bg-[#091e420f] text-[#44546f] hover:bg-[#091e4224]" : "bg-[#0c66e4] text-white hover:bg-[#0055cc]"}`}>{busy ? "Saving…" : hasAccess ? "Remove" : "Add"}</button>}</div>;
            })}
          </div>
          {!members.length ? <p className="py-6 text-center text-sm text-[#626f86]">No workspace members are available.</p> : null}
        </div>

        {!canManage ? <p className="mt-4 rounded-md bg-[#f4f5f7] p-3 text-xs text-[#626f86]">Only board members can change board access.</p> : <Link href={`/workspaces/members?workspaceId=${workspaceId}`} onClick={onClose} className="mt-4 block text-center text-sm font-semibold text-[#0c66e4] hover:underline">View workspace members</Link>}
      </section>
    </div>
  );
}
