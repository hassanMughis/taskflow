"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "../../lib/api-client";
import { DashboardShell } from "../dashboard/dashboard-shell";
import { Icon } from "../dashboard/dashboard-icon";

type Notification = {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  actor?: { id: string; name: string } | null;
  board?: { id: string; title: string; slug: string } | null;
  cardId?: string | null;
};

type NotificationsResponse = { notifications: Notification[] };
const filters = ["All", "Unread", "Mentions", "Assigned"];

function NotificationIcon({ type }: { type: string }) {
  const classes = type === "card_assignment" ? "bg-[#e6f0ff] text-[#3170d7]" : type === "card_comment" ? "bg-[#fde9dd] text-[#dd6a34]" : "bg-[#eeeef3] text-[#6b6c79]";
  const icon = type === "board_invite" ? "grid" : type === "card_comment" ? "bell" : "tasks";
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${classes}`}><Icon name={icon} size={18} /></span>;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const visibleNotifications = notifications.filter((notification) => activeFilter === "All" || activeFilter === "Unread" && !notification.readAt || activeFilter === "Mentions" && notification.type === "card_comment" || activeFilter === "Assigned" && notification.type === "card_assignment");

  useEffect(() => {
    apiGet<NotificationsResponse>("/notifications")
      .then((data) => { setNotifications(data.notifications); setError(null); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Failed to load notifications"));
  }, []);

  async function markRead(id: string) {
    try {
      const data = await apiPatch<{ notification: Notification }>(`/notifications/${id}/read`, {});
      setNotifications((current) => current.map((notification) => notification.id === id ? data.notification : notification));
      window.dispatchEvent(new CustomEvent("notifications-read", { detail: 1 }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to mark notification read");
    }
  }

  async function markAllRead() {
    try {
      await apiPatch("/notifications/read-all", {});
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })));
      window.dispatchEvent(new CustomEvent("notifications-read", { detail: unreadCount }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to mark notifications read");
    }
  }

  return (
    <DashboardShell active="Notifications">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-center justify-between"><div><h1 className="text-[31px] font-semibold text-[#172b4d] dark:text-[#f1f2f4] lg:text-[34px]">Notifications</h1><p className="mt-2 text-[16px] text-[#5b5c6a] dark:text-[#9fadbc]">Stay up to date with your workspaces.</p></div><button type="button" onClick={markAllRead} disabled={unreadCount === 0} className="text-sm font-medium text-[#0c66e4] disabled:text-[#9a9ba5] dark:text-[#579dff] dark:disabled:text-[#626f86]">Mark all as read</button></div>
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
        <section className="mt-9 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
            {filters.map((filter, index) => <button type="button" key={filter} onClick={() => setActiveFilter(filter)} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium lg:w-full ${activeFilter === filter ? "bg-[#e8e6ff] text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]" : "text-[#44546f] hover:bg-[#ededf1] dark:text-[#b6c2cf] dark:hover:bg-[#282e33]"}`}><span className="lg:hidden"><Icon name={index === 0 ? "grid" : index === 1 ? "bell" : "tasks"} size={17} /></span>{filter}{filter === "All" && unreadCount ? <span className="ml-auto rounded-full bg-[#0c66e4] px-1.5 text-[10px] text-white">{unreadCount}</span> : null}</button>)}
          </aside>
          <div className="overflow-hidden rounded-xl border border-[#d4d4e0] bg-white dark:border-[#3d4145] dark:bg-[#22272b]">
            {visibleNotifications.map((notification) => { const isUnread = !notification.readAt; const href = notification.board ? `/boards/${notification.board.slug}${notification.cardId ? `?card=${notification.cardId}` : ""}` : null; return <article key={notification.id} className={`flex gap-4 border-b border-[#e3e3eb] p-5 last:border-0 dark:border-[#3d4145] ${isUnread ? "bg-[#fbfaff] dark:bg-[#242a31]" : ""}`}><span className="relative"><NotificationIcon type={notification.type} />{isUnread ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0c66e4] dark:border-[#22272b]" /> : null}</span><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><h2 className="text-sm font-semibold leading-5 text-[#2b2c35] dark:text-[#f1f2f4]">{notification.message}</h2><time className="shrink-0 text-xs text-[#858592] dark:text-[#9fadbc]">{new Date(notification.createdAt).toLocaleString()}</time></div>{notification.actor ? <p className="mt-1 text-sm text-[#44546f] dark:text-[#9fadbc]">From {notification.actor.name}</p> : null}<div className="mt-3 flex gap-2"><button type="button" onClick={() => markRead(notification.id)} disabled={!isUnread} className="rounded-md border border-[#d1d1df] px-3 py-1.5 text-xs font-medium text-[#5a5b69] disabled:opacity-45 dark:border-[#626f86] dark:text-[#b6c2cf] dark:hover:bg-[#323940]">{isUnread ? "Mark read" : "Read"}</button>{href ? <Link href={href} onClick={() => { if (isUnread) void markRead(notification.id); }} className="rounded-md bg-[#0c66e4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0055cc]">Open</Link> : null}</div></div></article>; })}
            {visibleNotifications.length === 0 ? <p className="p-10 text-center text-sm text-[#44546f] dark:text-[#9fadbc]">No notifications in this view.</p> : null}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

