"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, apiPost } from "../../lib/api-client";
import { DashboardShell } from "../dashboard/dashboard-shell";
import { Icon } from "../dashboard/dashboard-icon";

type InboxItem = { id: string; title: string; description: string | null; createdAt: string };
type InboxBoard = { id: string; title: string; slug: string; lists: { id: string; title: string }[] };
type InboxData = { items: InboxItem[]; boards: InboxBoard[] };

export function InboxView() {
  const router = useRouter();
  const [data, setData] = useState<InboxData>({ items: [], boards: [] });
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState("");
  const [destinations, setDestinations] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    apiGet<InboxData>("/inbox")
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((reason: Error) => { if (active) setError(reason.message || "Inbox could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setPendingId("new");
    try {
      const result = await apiPost<{ item: InboxItem }>("/inbox", { title });
      setData((current) => ({ ...current, items: [result.item, ...current.items] }));
      setTitle("");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The item could not be added.");
    } finally {
      setPendingId("");
    }
  };

  const removeItem = async (itemId: string) => {
    setPendingId(itemId);
    try {
      await apiDelete(`/inbox/${itemId}`);
      setData((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The item could not be deleted.");
    } finally {
      setPendingId("");
    }
  };

  const moveToBoard = async (itemId: string) => {
    const listId = destinations[itemId];
    if (!listId) { setError("Choose a destination list first."); return; }
    setPendingId(itemId);
    try {
      const result = await apiPost<{ card: { id: string }; board: { slug: string } }>(`/inbox/${itemId}/convert`, { listId });
      router.push(`/boards/${result.board.slug}?card=${result.card.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The item could not be moved.");
      setPendingId("");
    }
  };

  return <DashboardShell active="Inbox">
    <div className="mx-auto w-full max-w-[920px] pb-12">
      <header><h1 className="flex items-center gap-2 text-2xl font-semibold text-[#172b4d] dark:text-[#f1f2f4]"><Icon name="tasks" size={24} />Inbox</h1><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">Capture ideas quickly, then organize them into a board when you are ready.</p></header>

      <form onSubmit={addItem} className="mt-6 rounded-xl border border-[#dcdfe4] bg-white p-4 shadow-sm dark:border-[#454f59] dark:bg-[#22272b]">
        <label htmlFor="inbox-title" className="sr-only">Add an inbox item</label>
        <div className="flex gap-3"><input id="inbox-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} placeholder="What do you need to remember?" className="h-11 min-w-0 flex-1 rounded-md border border-[#b7bec8] bg-white px-3 text-sm text-[#172b4d] outline-none placeholder:text-[#8590a2] focus:border-[#0c66e4] dark:border-[#454f59] dark:bg-[#1d2125] dark:text-[#f1f2f4]" /><button disabled={!title.trim() || pendingId === "new"} className="h-11 rounded-md bg-[#0c66e4] px-5 text-sm font-semibold text-white hover:bg-[#0055cc] disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>
      </form>

      {error ? <div role="alert" className="mt-4 rounded-md border border-[#f5cd47] bg-[#fff7d6] p-3 text-sm text-[#172b4d] dark:border-[#7f5f01] dark:bg-[#332e1b] dark:text-[#f1f2f4]">{error}</div> : null}
      {loading ? <div className="mt-6 h-32 animate-pulse rounded-xl bg-[#091e4214] dark:bg-[#282e33]" /> : null}
      {!loading && !data.items.length ? <div className="mt-6 rounded-xl border border-dashed border-[#b7bec8] px-6 py-12 text-center dark:border-[#454f59]"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]"><Icon name="check" size={23} /></span><h2 className="mt-3 font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Your inbox is clear</h2><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">Add a thought above whenever something comes to mind.</p></div> : null}

      <div className="mt-6 space-y-3">{data.items.map((item) => <article key={item.id} className="rounded-xl border border-[#dcdfe4] bg-white p-4 shadow-sm dark:border-[#454f59] dark:bg-[#22272b]">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{item.title}</h2>{item.description ? <p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">{item.description}</p> : null}<p className="mt-2 text-xs text-[#8590a2]">Captured {new Date(item.createdAt).toLocaleString()}</p></div><button type="button" aria-label={`Delete ${item.title}`} disabled={pendingId === item.id} onClick={() => removeItem(item.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#626f86] hover:bg-[#091e420f] hover:text-[#c9372c] dark:hover:bg-[#282e33]"><Icon name="x" size={17} /></button></div>
        <div className="mt-4 flex flex-col gap-2 border-t border-[#dcdfe4] pt-4 dark:border-[#454f59] sm:flex-row">
          <select value={destinations[item.id] || ""} onChange={(event) => setDestinations((current) => ({ ...current, [item.id]: event.target.value }))} className="h-10 min-w-0 flex-1 rounded-md border border-[#b7bec8] bg-white px-3 text-sm text-[#172b4d] outline-none focus:border-[#0c66e4] dark:border-[#454f59] dark:bg-[#1d2125] dark:text-[#f1f2f4]"><option value="">Choose a board list…</option>{data.boards.map((board) => <optgroup key={board.id} label={board.title}>{board.lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</optgroup>)}</select>
          <button type="button" disabled={!destinations[item.id] || pendingId === item.id} onClick={() => moveToBoard(item.id)} className="h-10 rounded-md bg-[#0c66e4] px-4 text-sm font-semibold text-white hover:bg-[#0055cc] disabled:cursor-not-allowed disabled:opacity-50">Move to board</button>
        </div>
      </article>)}</div>
    </div>
  </DashboardShell>;
}
