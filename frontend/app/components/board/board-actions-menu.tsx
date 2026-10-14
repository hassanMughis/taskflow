"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { apiDelete, apiPatch } from "../../lib/api-client";
import { Icon } from "../dashboard/dashboard-icon";
import { useDialogFocus } from "../use-dialog-focus";

type BoardActionsMenuProps = {
  boardId: string;
  title: string;
  archived?: boolean;
  onRenamed: (title: string) => void;
  onRemoved: (mode: "archived" | "restored" | "deleted") => void;
  onError: (message: string) => void;
};

export function BoardActionsMenu({ boardId, title, archived = false, onRenamed, onRemoved, onError }: BoardActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [nextTitle, setNextTitle] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameDialogRef = useDialogFocus<HTMLElement>(renameOpen);
  const deleteDialogRef = useDialogFocus<HTMLElement>(deleteOpen);

  const calculateMenuPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return { left: 8, top: 8 };
    const menuWidth = 192;
    const estimatedMenuHeight = 176;
    return {
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
      top: rect.bottom + 8 + estimatedMenuHeight <= window.innerHeight
        ? rect.bottom + 8
        : Math.max(8, rect.top - estimatedMenuHeight - 8),
    };
  }, []);

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    setMenuPosition(calculateMenuPosition());
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function updateMenuPosition() {
      const position = calculateMenuPosition();
      if (!menuRef.current) return;
      menuRef.current.style.left = `${position.left}px`;
      menuRef.current.style.top = `${position.top}px`;
    }
    function closeOnScroll() {
      if (menuRef.current) menuRef.current.style.display = "none";
      setMenuOpen(false);
    }
    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    updateMenuPosition();
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [calculateMenuPosition, menuOpen]);

  async function renameBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = nextTitle.trim();
    if (!normalizedTitle || normalizedTitle === title || isSaving) {
      setRenameOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await apiPatch(`/boards/${boardId}`, { title: normalizedTitle });
      onRenamed(normalizedTitle);
      setRenameOpen(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to rename board");
    } finally {
      setIsSaving(false);
    }
  }

  async function changeArchivedState() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await apiPatch(`/boards/${boardId}`, { archived: !archived });
      onRemoved(archived ? "restored" : "archived");
    } catch (error) {
      onError(error instanceof Error ? error.message : archived ? "Failed to reopen board" : "Failed to close board");
    } finally {
      setIsSaving(false);
      setMenuOpen(false);
    }
  }

  async function deleteBoard() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await apiDelete(`/boards/${boardId}`);
      onRemoved("deleted");
      setDeleteOpen(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to delete board");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div ref={triggerRef} className="absolute right-3 top-3 z-20">
        <button type="button" aria-label={`Board options for ${title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={toggleMenu} className="flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/55"><Icon name="ellipsis" size={18} /></button>
      </div>

      {menuOpen ? createPortal(<div ref={menuRef} role="menu" style={menuPosition} className="fixed z-100 w-48 rounded-lg border border-[#dfe1e6] bg-white p-1.5 text-sm text-[#172b4d] shadow-xl dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#f1f2f4]">
          <button type="button" role="menuitem" onClick={() => { setNextTitle(title); setMenuOpen(false); setRenameOpen(true); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-[#f1f2f4] dark:hover:bg-[#3b444c]"><Pencil size={15} />Edit title</button>
          <button type="button" role="menuitem" onClick={changeArchivedState} disabled={isSaving} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-[#f1f2f4] disabled:opacity-50 dark:hover:bg-[#3b444c]"><Archive size={15} />{archived ? "Reopen board" : "Close board"}</button>
          <div className="my-1 border-t border-[#dfe1e6] dark:border-[#454f59]" />
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[#c9372c] hover:bg-red-50 dark:text-[#ff8f73] dark:hover:bg-red-950/40"><Trash2 size={15} />Delete board</button>
        </div>, document.body) : null}

      {renameOpen ? createPortal(<div className="fixed inset-0 z-120 flex items-center justify-center bg-[#172b4d]/45 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget && !isSaving) setRenameOpen(false); }}><section ref={renameDialogRef} role="dialog" aria-modal="true" aria-labelledby={`rename-board-${boardId}`} className="w-full max-w-sm rounded-xl bg-white p-5 text-[#172b4d] shadow-2xl"><header className="flex items-center justify-between"><h2 id={`rename-board-${boardId}`} className="text-lg font-semibold">Edit board title</h2><button type="button" aria-label="Close" onClick={() => setRenameOpen(false)} disabled={isSaving}><Icon name="x" size={18} /></button></header><form onSubmit={renameBoard}><label className="mt-5 block text-sm font-semibold">Board title<input autoFocus value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} maxLength={120} className="mt-2 h-10 w-full rounded-md border border-[#8590a2] px-3 outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20" /></label><button type="submit" disabled={!nextTitle.trim() || isSaving} className="mt-5 h-10 w-full rounded-md bg-[#0c66e4] text-sm font-semibold text-white disabled:opacity-45">{isSaving ? "Saving…" : "Save"}</button></form></section></div>, document.body) : null}

      {deleteOpen ? createPortal(<div className="fixed inset-0 z-120 flex items-center justify-center bg-[#172b4d]/45 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget && !isSaving) setDeleteOpen(false); }}><section ref={deleteDialogRef} role="alertdialog" aria-modal="true" aria-labelledby={`delete-board-${boardId}`} className="w-full max-w-sm rounded-xl bg-white p-5 text-[#172b4d] shadow-2xl"><h2 id={`delete-board-${boardId}`} className="text-lg font-semibold">Delete “{title}”?</h2><p className="mt-3 text-sm leading-5 text-[#626f86]">This permanently deletes the board, its lists, cards, comments, and attachments. This cannot be undone.</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => setDeleteOpen(false)} disabled={isSaving} className="h-10 flex-1 rounded-md border border-[#8590a2] text-sm font-semibold hover:bg-[#f1f2f4]">Cancel</button><button type="button" onClick={deleteBoard} disabled={isSaving} className="h-10 flex-1 rounded-md bg-[#c9372c] text-sm font-semibold text-white hover:bg-[#ae2e24] disabled:opacity-45">{isSaving ? "Deleting…" : "Delete"}</button></div></section></div>, document.body) : null}
    </>
  );
}
