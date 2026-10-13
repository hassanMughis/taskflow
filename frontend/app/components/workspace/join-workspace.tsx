"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api-client";

export function JoinWorkspace({ token }: { token: string }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet<{ invitation: { workspace: { id: string; name: string } } }>(`/invitations/${encodeURIComponent(token)}`)
      .then((data) => { if (active) setWorkspace(data.invitation.workspace); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Invitation could not be loaded"); });
    return () => { active = false; };
  }, [token]);

  async function join() {
    const returnPath = `/join/${token}`;
    if (!localStorage.getItem("kanvero_token")) {
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    setJoining(true);
    try {
      const data = await apiPost<{ workspace: { id: string } }>(`/invitations/${encodeURIComponent(token)}/accept`, {});
      router.push(`/workspaces?workspaceId=${data.workspace.id}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not join workspace");
      setJoining(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-4 dark:bg-[#1d1f21]"><section className="w-full max-w-md rounded-xl border border-[#dcdfe4] bg-white p-7 text-center text-[#172b4d] shadow-xl dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#b6c2cf]"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#0c66e4] text-2xl font-bold text-white">K</div>{error ? <><h1 className="mt-6 text-xl font-semibold">Invitation unavailable</h1><p className="mt-3 text-sm text-[#626f86] dark:text-[#9fadbc]">{error}</p><Link href="/dashboard" className="mt-6 inline-block text-sm font-semibold text-[#0c66e4] dark:text-[#579dff]">Return to Kanvero</Link></> : workspace ? <><h1 className="mt-6 text-2xl font-semibold">Join {workspace.name}</h1><p className="mt-3 text-sm text-[#626f86] dark:text-[#9fadbc]">Accept this invitation to become a workspace member.</p><button type="button" disabled={joining} onClick={join} className="mt-6 h-11 w-full rounded-lg bg-[#0c66e4] font-semibold text-white disabled:opacity-50">{joining ? "Joining…" : "Join workspace"}</button><Link href={`/?next=${encodeURIComponent(`/join/${token}`)}`} className="mt-4 block text-sm text-[#0c66e4] dark:text-[#579dff]">New to Kanvero? Create an account</Link></> : <p className="mt-6 text-sm text-[#626f86] dark:text-[#9fadbc]">Loading invitation…</p>}</section></main>;
}
