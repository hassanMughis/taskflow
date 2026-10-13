"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useDialogFocus } from "../use-dialog-focus";
import { Icon } from "./dashboard-icon";

export const DEFAULT_BOARD_COVER = "/board-cover-studio.png";

const imageBackgrounds = [
  { value: "/board-cover-studio.png", label: "Creative studio" },
  { value: "/board-cover-coast.png", label: "Sunset coast" },
  { value: "/board-cover-mountain.png", label: "Mountain valley" },
  { value: "/categories/cat-remote-work.png", label: "Remote workspace" },
];

const colorBackgrounds = [
  { from: "#0c66e4", to: "#579dff", label: "Blue" },
  { from: "#0f8a72", to: "#6cc3b8", label: "Teal" },
  { from: "#7f5f01", to: "#e2b203", label: "Gold" },
  { from: "#c9372c", to: "#f87168", label: "Coral" },
  { from: "#0055cc", to: "#9f8fef", label: "Purple" },
];

function gradientCover(from: string, to: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const colorOptions = colorBackgrounds.map((color) => ({
  ...color,
  value: gradientCover(color.from, color.to),
}));

type WorkspaceOption = { id: string; name: string };

type CreateBoardDialogProps = {
  title: string;
  cover: string | null;
  workspaceId: string;
  visibility: "private" | "workspace" | "public";
  fromTemplate: boolean;
  workspaces: WorkspaceOption[];
  error: string | null;
  onTitleChange: (title: string) => void;
  onCoverChange: (cover: string) => void;
  onWorkspaceChange: (workspaceId: string) => void;
  onVisibilityChange: (visibility: "private" | "workspace" | "public") => void;
  onCreate: () => Promise<void>;
  onClose: () => void;
  onStartTemplate: () => void;
};

export function CreateBoardDialog({ title, cover, workspaceId, visibility, fromTemplate, workspaces, error, onTitleChange, onCoverChange, onWorkspaceChange, onVisibilityChange, onCreate, onClose, onStartTemplate }: CreateBoardDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useDialogFocus<HTMLElement>(true);
  const selectedCover = cover ?? DEFAULT_BOARD_COVER;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSubmitting, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !workspaceId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreate();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172b4d]/55 p-3 backdrop-blur-[2px]" onPointerDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="create-board-title" className="max-h-[calc(100dvh-24px)] w-full max-w-[430px] overflow-y-auto rounded-xl border border-[#d9dce2] bg-white text-[#172b4d] shadow-[0_28px_80px_rgba(9,30,66,0.3)] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#f1f2f4]">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[40px_1fr_40px] items-center border-b border-[#dfe1e6] bg-white/95 px-2 backdrop-blur dark:border-[#454f59] dark:bg-[#22272b]/95">
          <span />
          <h2 id="create-board-title" className="text-center text-sm font-semibold">Create board</h2>
          <button type="button" aria-label="Close create board" onClick={onClose} disabled={isSubmitting} className="flex h-8 w-8 items-center justify-center rounded-md text-[#44546f] hover:bg-[#091e420f] disabled:opacity-50"><Icon name="x" size={18} /></button>
        </header>

        <form onSubmit={submit} className="p-4">
          <div className="relative mx-auto h-[150px] w-[250px] overflow-hidden rounded-lg bg-[#0055cc] bg-cover bg-center shadow-lg" style={{ backgroundImage: `linear-gradient(rgba(9,30,66,.16),rgba(9,30,66,.16)),url("${selectedCover}")` }} aria-label="Board background preview">
            <div className="absolute inset-0 flex gap-2 p-4 pt-8">
              {[0, 1, 2].map((column) => <div key={column} className="h-fit flex-1 rounded-md bg-[#f1f2f4]/95 p-2 shadow-sm"><span className="block h-2 w-3/4 rounded bg-[#44546f]/55" /><span className="mt-2 block h-5 rounded bg-white shadow-sm" /><span className="mt-1.5 block h-5 rounded bg-white shadow-sm" />{column !== 2 ? <span className="mt-1.5 block h-5 rounded bg-white shadow-sm" /> : null}</div>)}
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="text-xs font-semibold text-[#44546f]">Background</legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {imageBackgrounds.map((background) => {
                const selected = selectedCover === background.value;
                return <button key={background.value} type="button" aria-label={background.label} aria-pressed={selected} onClick={() => onCoverChange(background.value)} className={`relative h-12 overflow-hidden rounded-md ring-offset-2 transition hover:brightness-90 ${selected ? "ring-2 ring-[#0c66e4]" : "ring-1 ring-[#dfe1e6]"}`}><Image src={background.value} alt="" fill sizes="96px" className="object-cover" />{selected ? <span className="absolute inset-0 flex items-center justify-center bg-[#091e42]/25 text-white"><Icon name="check" size={18} /></span> : null}</button>;
              })}
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {colorOptions.map((color) => {
                const selected = selectedCover === color.value;
                return <button key={color.label} type="button" aria-label={`${color.label} background`} aria-pressed={selected} onClick={() => onCoverChange(color.value)} className={`relative h-9 rounded-md ring-offset-2 transition hover:brightness-90 ${selected ? "ring-2 ring-[#0c66e4]" : "ring-1 ring-black/5"}`} style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>{selected ? <span className="absolute inset-0 flex items-center justify-center text-white"><Icon name="check" size={17} /></span> : null}</button>;
              })}
            </div>
          </fieldset>

          <label className="mt-5 block text-xs font-semibold text-[#44546f]">Board title <span className="text-[#c9372c]">*</span><input autoFocus value={title} onChange={(event) => onTitleChange(event.target.value)} maxLength={120} className="mt-2 h-10 w-full rounded-md border border-[#8590a2] bg-white px-3 text-sm outline-none transition focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20" /></label>
          {!title.trim() ? <p className="mt-1.5 text-xs text-[#626f86]">A board title is required.</p> : null}
          {fromTemplate ? <p className="mt-2 rounded-md bg-[#e9f2ff] px-3 py-2 text-xs font-medium text-[#0c4a8a]">This template&apos;s lists and starter cards will be copied into the new board.</p> : null}

          <label className="mt-4 block text-xs font-semibold text-[#44546f]">Workspace<select value={workspaceId} onChange={(event) => onWorkspaceChange(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#8590a2] bg-white px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20"><option value="" disabled>Select a workspace</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>

          <label className="mt-4 block text-xs font-semibold text-[#44546f]">Visibility<select value={visibility} onChange={(event) => onVisibilityChange(event.target.value as typeof visibility)} className="mt-2 h-10 w-full rounded-md border border-[#8590a2] bg-white px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20"><option value="private">Private</option><option value="workspace">Workspace</option><option value="public">Public</option></select></label>
          <p className="mt-1.5 text-xs text-[#626f86]">{visibility === "private" ? "Only explicitly invited board members can access it." : visibility === "workspace" ? "All workspace members can discover and access it." : "Any signed-in user with the link can view it."}</p>

          {error ? <p role="alert" className="mt-4 rounded-md border border-[#f5cd47] bg-[#fff7d6] px-3 py-2 text-xs text-[#533f04]">{error}</p> : null}

          <button type="submit" disabled={!title.trim() || !workspaceId || isSubmitting} className="mt-5 h-10 w-full rounded-md bg-[#0c66e4] text-sm font-semibold text-white transition hover:bg-[#0055cc] disabled:cursor-not-allowed disabled:bg-[#091e4224] disabled:text-[#626f86]">{isSubmitting ? "Creating…" : "Create"}</button>
          <button type="button" onClick={onStartTemplate} disabled={isSubmitting} className="mt-2 h-10 w-full rounded-md border border-[#8590a2] bg-white text-sm font-semibold text-[#44546f] transition hover:bg-[#091e420f] disabled:opacity-50 dark:border-[#626f86] dark:bg-[#1d2125] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]">Start with a template</button>
          <p className="mt-3 text-xs leading-4 text-[#626f86]">Background images come from your generated template library. A default cover is always applied.</p>
        </form>
      </section>
    </div>
  );
}

