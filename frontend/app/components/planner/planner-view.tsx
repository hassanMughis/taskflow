"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/api-client";
import { DashboardShell } from "../dashboard/dashboard-shell";
import { Icon } from "../dashboard/dashboard-icon";

type Board = { title: string; slug: string };
type PlannerCard = { id: string; title: string; completed: boolean; dueDate: string | null; dueTime: string | null; list: { title: string; board: Board } };
type PlannerChecklist = { id: string; title: string; dueDate: string | null; checklist: { title: string; card: { id: string; title: string; list: { board: Board } } } };
type PlannerData = { generatedAt: string; assignedCards: PlannerCard[]; checklistItems: PlannerChecklist[] };
type PlannerItem = { id: string; title: string; context: string; board: Board; cardId: string; dueDate: string | null; dueTime: string | null; completed: boolean };

function dateKey(date: string | null) {
  return date ? date.slice(0, 10) : null;
}

function readableDate(date: string | null, time: string | null) {
  if (!date) return "No due date";
  const value = new Date(`${date.slice(0, 10)}T${time || "23:59:59"}`);
  return `${value.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${time ? ` · ${time.slice(0, 5)}` : ""}`;
}

function ItemRow({ item }: { item: PlannerItem }) {
  return <Link href={`/boards/${item.board.slug}?card=${item.cardId}`} className="flex items-center gap-3 border-b border-[#dcdfe4] px-4 py-3 last:border-0 hover:bg-[#f7f8f9] dark:border-[#454f59] dark:hover:bg-[#282e33]">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.completed ? "bg-[#dffcf0] text-[#1f845a]" : "bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]"}`}><Icon name={item.completed ? "check" : "calendar"} size={16} /></span>
    <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-semibold text-[#172b4d] dark:text-[#f1f2f4] ${item.completed ? "line-through opacity-70" : ""}`}>{item.title}</span><span className="block truncate text-xs text-[#626f86] dark:text-[#9fadbc]">{item.board.title} · {item.context}</span></span>
    <span className="shrink-0 text-xs text-[#626f86] dark:text-[#9fadbc]">{readableDate(item.dueDate, item.dueTime)}</span>
  </Link>;
}

export function PlannerView() {
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet<PlannerData>("/home")
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((reason: Error) => { if (active) setError(reason.message || "Planner could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const groups = useMemo(() => {
    const today = data?.generatedAt.slice(0, 10) || "";
    const cards: PlannerItem[] = (data?.assignedCards || []).map((card) => ({ id: `card-${card.id}`, title: card.title, context: card.list.title, board: card.list.board, cardId: card.id, dueDate: card.dueDate, dueTime: card.dueTime, completed: card.completed }));
    const checks: PlannerItem[] = (data?.checklistItems || []).map((item) => ({ id: `check-${item.id}`, title: item.title, context: `${item.checklist.card.title} · ${item.checklist.title}`, board: item.checklist.card.list.board, cardId: item.checklist.card.id, dueDate: item.dueDate, dueTime: null, completed: false }));
    const items = [...cards, ...checks].filter((item) => showCompleted || !item.completed);
    return [
      { title: "Overdue", tone: "text-[#c9372c]", items: items.filter((item) => item.dueDate && dateKey(item.dueDate)! < today) },
      { title: "Today", tone: "text-[#0c66e4] dark:text-[#579dff]", items: items.filter((item) => dateKey(item.dueDate) === today) },
      { title: "Upcoming", tone: "text-[#172b4d] dark:text-[#f1f2f4]", items: items.filter((item) => item.dueDate && dateKey(item.dueDate)! > today) },
      { title: "Unscheduled", tone: "text-[#44546f] dark:text-[#b6c2cf]", items: items.filter((item) => !item.dueDate) },
    ];
  }, [data, showCompleted]);

  return <DashboardShell active="Planner">
    <div className="mx-auto w-full max-w-[1050px] pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dcdfe4] pb-5 dark:border-[#454f59]">
        <div><h1 className="flex items-center gap-2 text-2xl font-semibold text-[#172b4d] dark:text-[#f1f2f4]"><Icon name="calendar" size={24} />Planner</h1><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">Cards and checklist work assigned to you, organized by due date.</p></div>
        <label className="flex items-center gap-2 text-sm text-[#44546f] dark:text-[#b6c2cf]"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} className="h-4 w-4 accent-[#0c66e4]" />Show completed</label>
      </header>

      {error ? <div role="alert" className="mt-6 rounded-md border border-[#f5cd47] bg-[#fff7d6] p-4 text-sm text-[#172b4d] dark:border-[#7f5f01] dark:bg-[#332e1b] dark:text-[#f1f2f4]">{error}</div> : null}
      {loading ? <div className="mt-6 space-y-4" aria-label="Loading planner"><div className="h-28 animate-pulse rounded-lg bg-[#091e4214] dark:bg-[#282e33]" /><div className="h-28 animate-pulse rounded-lg bg-[#091e4214] dark:bg-[#282e33]" /></div> : null}
      {!loading && !error ? <div className="mt-6 space-y-7">{groups.map((group) => <section key={group.title}>
        <h2 className={`mb-3 text-base font-semibold ${group.tone}`}>{group.title} <span className="ml-1 text-xs font-normal text-[#626f86] dark:text-[#9fadbc]">{group.items.length}</span></h2>
        <div className="overflow-hidden rounded-lg border border-[#dcdfe4] bg-white shadow-sm dark:border-[#454f59] dark:bg-[#22272b]">{group.items.length ? group.items.map((item) => <ItemRow key={item.id} item={item} />) : <p className="px-4 py-5 text-sm text-[#626f86] dark:text-[#9fadbc]">Nothing here.</p>}</div>
      </section>)}</div> : null}
    </div>
  </DashboardShell>;
}
