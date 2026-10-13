"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api-client";
import { DashboardShell } from "./dashboard-shell";
import { Icon } from "./dashboard-icon";

type Workspace = { id: string; name: string };
type Board = { id: string; title: string; slug: string; coverUrl: string | null; workspace?: Workspace };
type HomeData = { starredBoards: Board[]; recentBoards: Board[] };

const EMPTY_HOME: HomeData = { starredBoards: [], recentBoards: [] };

function BoardRow({ board }: { board: Board }) {
  return (
    <Link href={`/boards/${board.slug}`} className="group flex items-center gap-3 rounded-md p-1.5 hover:bg-[#091e420f] dark:hover:bg-[#282e33]">
      <span className="relative flex h-9 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-[#dfe1e6] text-[#44546f] dark:bg-[#3b444c] dark:text-[#b6c2cf]">
        {board.coverUrl ? <Image src={board.coverUrl} alt="" fill sizes="44px" className="object-cover" /> : <Icon name="grid" size={16} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#172b4d] group-hover:underline dark:text-[#f1f2f4]">{board.title}</span>
        {board.workspace?.name ? <span className="block truncate text-xs text-[#626f86] dark:text-[#9fadbc]">{board.workspace.name}</span> : null}
      </span>
    </Link>
  );
}

export function HomeOverview() {
  const [data, setData] = useState<HomeData>(EMPTY_HOME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiGet<HomeData>("/home")
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((reason: Error) => { if (active) setError(reason.message || "Home could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <DashboardShell active="Home">
      <div className="mx-auto grid w-full max-w-[950px] items-start gap-10 pb-12 lg:grid-cols-[minmax(0,610px)_230px]">
        <main className="min-w-0">
          <section className="overflow-hidden rounded-lg border border-[#dcdfe4] bg-white shadow-sm dark:border-[#101214] dark:bg-[#22272b]">
            <div className="relative h-[150px] overflow-hidden bg-[#e9f2ff] dark:bg-[#332719]">
              <Image src="/board-cover-studio.png" alt="" fill priority sizes="(min-width: 1024px) 610px, 100vw" className="object-cover object-center opacity-90 dark:opacity-75" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5" />
              <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/70 bg-[#0c66e4]/90 text-3xl font-black text-white shadow-xl backdrop-blur-sm">K</span>
            </div>
            <div className="px-6 py-5 text-center">
              <h1 className="text-lg font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Stay on track and up to date</h1>
              <p className="mx-auto mt-3 max-w-[520px] text-sm leading-5 text-[#44546f] dark:text-[#b6c2cf]">Capture new ideas in Inbox, plan upcoming work, and keep every project moving from your boards.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/inbox" className="rounded-md bg-[#0c66e4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0055cc] dark:bg-[#579dff] dark:text-[#0c2444]">Open Inbox</Link>
                <Link href="/planner" className="rounded-md border border-[#b7bec8] px-4 py-2 text-sm font-semibold text-[#172b4d] hover:bg-[#091e420f] dark:border-[#626f86] dark:text-[#f1f2f4] dark:hover:bg-[#282e33]">View Planner</Link>
              </div>
            </div>
          </section>

          {error ? <div role="alert" className="mt-5 rounded-md border border-[#f5cd47] bg-[#fff7d6] p-4 text-sm text-[#172b4d] dark:border-[#7f5f01] dark:bg-[#332e1b] dark:text-[#f1f2f4]">{error}</div> : null}
        </main>

        <aside className="space-y-8">
          {data.starredBoards.length ? <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]"><Icon name="star" size={16} />Starred boards</div>
            <div className="space-y-1">{data.starredBoards.map((board) => <BoardRow key={board.id} board={board} />)}</div>
          </section> : null}

          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]"><Icon name="history" size={16} />Recently viewed</div>
            {loading ? <div className="space-y-2" aria-label="Loading recent boards"><div className="h-12 animate-pulse rounded bg-[#091e4214] dark:bg-[#282e33]" /><div className="h-12 animate-pulse rounded bg-[#091e4214] dark:bg-[#282e33]" /></div> : null}
            {!loading ? <div className="space-y-1">{data.recentBoards.map((board) => <BoardRow key={board.id} board={board} />)}{!data.recentBoards.length ? <p className="px-1.5 py-2 text-sm text-[#626f86] dark:text-[#9fadbc]">No boards viewed yet.</p> : null}</div> : null}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]">Links</h2>
            <Link href="/dashboard?create=1" className="flex items-center gap-3 rounded-md p-1.5 text-sm font-semibold text-[#172b4d] hover:bg-[#091e420f] dark:text-[#f1f2f4] dark:hover:bg-[#282e33]"><span className="flex h-9 w-11 items-center justify-center rounded bg-[#091e420f] dark:bg-[#454b52]"><Icon name="plus" size={17} /></span>Create new board</Link>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}
