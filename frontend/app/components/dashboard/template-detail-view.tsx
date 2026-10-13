"use client";

import Image from "next/image";
import Link from "next/link";
import { Copy, Eye, LockKeyhole, Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { apiGet } from "../../lib/api-client";
import { DashboardShell } from "./dashboard-shell";
import { templateCreateUrl } from "./template-utils";

type TemplateDetailViewProps = {
  category: string;
  title: string;
  cover: string;
  author: string;
  description: string;
  uses: string;
  views: string;
};

type Workspace = {
  id: string;
  name: string;
};

function categoryTitle(category: string) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TemplateDetailView({
  category,
  title,
  cover,
  author,
  description,
  uses,
  views,
}: TemplateDetailViewProps) {
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const useTemplateButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLFormElement>(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [keepCards, setKeepCards] = useState(true);
  const [keepTemplateCards, setKeepTemplateCards] = useState(true);
  const [shareLabel, setShareLabel] = useState("Share");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 16 });

  useEffect(() => {
    let active = true;

    apiGet<{ workspaces: Workspace[] }>("/api/workspaces")
      .then((response) => {
        if (!active) return;
        const nextWorkspaces = response.workspaces ?? [];
        setWorkspaces(nextWorkspaces);
        setWorkspaceId(nextWorkspaces[0]?.id ?? "");
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!createOpen) return;

    const positionPopup = () => {
      const button = useTemplateButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const popupWidth = Math.min(360, window.innerWidth - 32);
      setPopupPosition({
        top: rect.bottom + window.scrollY + 3,
        left: Math.max(16, Math.min(rect.right + window.scrollX - popupWidth, window.innerWidth + window.scrollX - popupWidth - 16)),
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCreateOpen(false);
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !popupRef.current?.contains(target) &&
        !useTemplateButtonRef.current?.contains(target)
      ) {
        setCreateOpen(false);
      }
    };

    positionPopup();
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", positionPopup);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", positionPopup);
    };
  }, [createOpen]);

  const openCreatePopup = () => {
    const button = useTemplateButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const popupWidth = Math.min(360, window.innerWidth - 32);
      setPopupPosition({
        top: rect.bottom + window.scrollY + 3,
        left: Math.max(16, Math.min(rect.right + window.scrollX - popupWidth, window.innerWidth + window.scrollX - popupWidth - 16)),
      });
    }
    setCreateOpen(true);
    window.setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const createBoard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!boardTitle.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    const url = new URL(
      templateCreateUrl(boardTitle.trim(), cover),
      window.location.origin,
    );
    if (workspaceId) url.searchParams.set("workspaceId", workspaceId);
    url.searchParams.set("keepCards", String(keepCards));
    url.searchParams.set("keepTemplateCards", String(keepTemplateCards));
    router.push(`${url.pathname}${url.search}`);
  };

  const shareTemplate = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share"), 1600);
    } catch {
      setShareLabel("Copy link");
    }
  };

  const searchTemplates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/templates?q=${encodeURIComponent(query)}` : "/templates");
  };

  return (
    <DashboardShell active="Templates">
      <div className="mx-auto max-w-[908px] pb-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Link href="/templates" className="hover:underline">
              Template gallery
            </Link>
            <span>/</span>
            <Link href={`/templates/${category}`} className="hover:underline">
              {categoryTitle(category)}
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-100">{title}</span>
          </nav>

          <form onSubmit={searchTemplates} role="search" className="flex h-11 w-full max-w-[264px] items-center gap-3 rounded border border-slate-300 px-4 text-slate-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-[#45474d] dark:text-slate-400">
            <input
              aria-label="Find template"
              placeholder="Find template"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
            <button type="submit" aria-label="Search templates" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-[#282a2f]"><Search className="h-5 w-5" /></button>
          </form>
        </div>

        <div className="mb-9 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden rounded-full bg-slate-200">
              <Image src="/avatars/template-author.svg" alt="" fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[27px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                {title}
              </h1>
              <p className="text-slate-700 dark:text-slate-200">Created by {author}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Copy className="h-4 w-4" /> {uses} Copies
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-4 w-4" /> {views} Views
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-4">
            <button
              type="button"
              onClick={shareTemplate}
              className="h-12 rounded-md border border-slate-300 px-6 font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#414349] dark:text-slate-300 dark:hover:bg-[#282a2f]"
            >
              {shareLabel}
            </button>
            <button
              ref={useTemplateButtonRef}
              type="button"
              onClick={openCreatePopup}
              className="h-12 rounded-md bg-[#579dff] px-6 font-semibold text-[#0c2444] hover:bg-[#85b8ff]"
            >
              Use template
            </button>
          </div>
        </div>

        <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          About this template
        </h2>

        <div className="relative h-[510px] overflow-hidden rounded-md bg-slate-200 shadow-sm">
          <Image src={cover} alt={title} fill priority className="object-cover" sizes="908px" />
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded bg-black/75 text-xs font-bold text-white">
            i
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">
          {description}
        </p>
      </div>

      {createOpen ? createPortal(<form
            ref={popupRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="use-template-title"
            onSubmit={createBoard}
            style={{ top: popupPosition.top, left: popupPosition.left }}
            className="absolute z-[100] w-[calc(100vw-32px)] max-w-[360px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl animate-[fadeIn_150ms_ease-out] dark:border-[#45474d] dark:bg-[#282e33]"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="use-template-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Use template
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCreateOpen(false)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#3b4045]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Title
              <input
                ref={titleInputRef}
                value={boardTitle}
                onChange={(event) => setBoardTitle(event.target.value)}
                placeholder={`Like "${title}" for example`}
                className="mt-1.5 h-10 w-full rounded border border-slate-400 bg-transparent px-3 font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#626f86]"
              />
            </label>

            <label className="mb-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Workspace
              <select
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                className="mt-1.5 h-10 w-full rounded border border-slate-400 bg-white px-3 font-normal outline-none dark:border-[#626f86] dark:bg-[#22272b]"
              >
                {workspaces.length ? (
                  workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))
                ) : (
                  <option value="">Your workspace</option>
                )}
              </select>
            </label>

            <p className="mb-5 flex gap-2 text-sm text-slate-600 dark:text-slate-300">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>
                The new board will be <strong>Private.</strong>
              </span>
            </p>

            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={keepCards}
                onChange={(event) => setKeepCards(event.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
              Keep cards
            </label>
            <label className="mb-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={keepTemplateCards}
                onChange={(event) => setKeepTemplateCards(event.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
              Keep template cards
            </label>

            <p className="mb-5 text-sm leading-5 text-slate-500 dark:text-slate-400">
              Activity, comments, and members will not be copied to the new board.
            </p>

            <button
              type="submit"
              disabled={!boardTitle.trim()}
              className="h-10 rounded-md bg-[#579dff] px-5 font-semibold text-[#0c2444] hover:bg-[#85b8ff] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-[#45474d] dark:disabled:text-slate-400"
            >
              Create
            </button>
      </form>, document.body) : null}
    </DashboardShell>
  );
}
