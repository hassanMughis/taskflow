"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/api-client";
import { DashboardShell } from "../dashboard/dashboard-shell";
import { Icon } from "../dashboard/dashboard-icon";

type WorkspaceMember = { id: string; name: string; handle: string; initials: string; role: string; boards: number; owner?: boolean };

type ApiWorkspaceMember = { id: string; name: string; email: string; WorkspaceMember?: { role: string } };
type WorkspaceResponse = { workspace: { id: string; ownerId: string; members: ApiWorkspaceMember[] } };
type BoardsResponse = { boards: Array<{ members?: Array<{ id: string }> }> };
type WorkspaceGuest = { id: string; name: string; email: string; boards: Array<{ id: string; title: string }> };
type WorkspaceInvite = { id: string; token: string; expiresAt: string };
type CollaboratorsResponse = { members: ApiWorkspaceMember[]; guests: WorkspaceGuest[]; invites: WorkspaceInvite[] };

const memberTabs = ["Members", "Single-board guests", "Multi-board guests", "Join requests"];

export function WorkspaceMembers({ selectedWorkspaceId }: { selectedWorkspaceId: string | null }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [guests, setGuests] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvite[]>([]);
  const [canManageWorkspace, setCanManageWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Members");
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [upgradeMessage, setUpgradeMessage] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const tabMembers = activeTab === "Members" ? members : activeTab === "Single-board guests" ? guests.filter((guest) => guest.boards === 1) : activeTab === "Multi-board guests" ? guests.filter((guest) => guest.boards > 1) : [];
  const visibleMembers = tabMembers.filter((member) => `${member.name} ${member.handle}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!selectedWorkspaceId) {
      queueMicrotask(() => setError("Select a workspace from the dashboard."));
      return;
    }
    Promise.all([
      apiGet<WorkspaceResponse>(`/workspaces/${selectedWorkspaceId}`),
      apiGet<BoardsResponse>(`/boards?workspaceId=${selectedWorkspaceId}`),
      apiGet<{ user: { id: string } }>("/auth/me"),
      apiGet<CollaboratorsResponse>(`/workspaces/${selectedWorkspaceId}/collaborators`),
    ])
      .then(([{ workspace }, { boards }, { user }, collaborators]) => {
        setWorkspaceId(selectedWorkspaceId);
        const currentMembership = workspace.members.find((member) => String(member.id) === String(user.id));
        setCanManageWorkspace(String(workspace.ownerId) === String(user.id) || ["owner", "admin"].includes(currentMembership?.WorkspaceMember?.role ?? ""));
        setMembers(workspace.members.map((member) => ({
          id: member.id,
          name: member.name,
          handle: member.email.split("@")[0],
          initials: member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
          role: member.WorkspaceMember?.role ?? "member",
          boards: boards.filter((board) => board.members?.some((boardMember) => String(boardMember.id) === String(member.id))).length,
          owner: String(member.id) === String(workspace.ownerId),
        })));
        setGuests(collaborators.guests.map((guest) => ({ id: guest.id, name: guest.name, handle: guest.email.split("@")[0], initials: guest.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: "guest", boards: guest.boards.length })));
        setInvitations(collaborators.invites);
        setError(null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Failed to load members"));
  }, [selectedWorkspaceId]);

  async function inviteMember() {
    const email = inviteEmail.trim();
    if (!email || !workspaceId || !canManageWorkspace) return;
    try {
      const data = await apiPost<{ user: { id: string; name: string; email: string } }>(`/workspaces/${workspaceId}/members`, { email });
      const member: WorkspaceMember = { id: data.user.id, name: data.user.name, handle: data.user.email.split("@")[0], initials: data.user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: "member", boards: 0 };
      setMembers((current) => current.some((item) => item.id === member.id) ? current : [...current, member]);
      setInviteEmail("");
      setInviteOpen(false);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to invite member");
    }
  }

  async function removeMember(memberId: string) {
    if (!workspaceId || !canManageWorkspace) return;
    try {
      await apiDelete(`/workspaces/${workspaceId}/members/${memberId}`);
      setMembers((current) => current.filter((item) => item.id !== memberId));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to remove member");
    }
  }

  async function changeRole(memberId: string, role: "admin" | "member") {
    if (!workspaceId || !canManageWorkspace) return;
    const previous = members.find((member) => member.id === memberId)?.role;
    setMembers((current) => current.map((member) => member.id === memberId ? { ...member, role } : member));
    try { await apiPatch(`/workspaces/${workspaceId}/members/${memberId}`, { role }); }
    catch (requestError) { setMembers((current) => current.map((member) => member.id === memberId ? { ...member, role: previous ?? "member" } : member)); setError(requestError instanceof Error ? requestError.message : "Failed to change role"); }
  }

  async function createInviteLink() {
    if (!workspaceId || !canManageWorkspace) return;
    try {
      const data = await apiPost<{ invite: WorkspaceInvite }>(`/workspaces/${workspaceId}/invites`, {});
      const link = `${window.location.origin}/join/${data.invite.token}`;
      setInviteLink(link);
      setInvitations((current) => [data.invite, ...current]);
      await navigator.clipboard.writeText(link).catch(() => undefined);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Failed to create invitation link"); }
  }

  async function revokeInvite(inviteId: string) {
    if (!workspaceId || !canManageWorkspace) return;
    try { await apiDelete(`/workspaces/${workspaceId}/invites/${inviteId}`); setInvitations((current) => current.filter((invite) => invite.id !== inviteId)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Failed to revoke invitation"); }
  }

  return (
    <DashboardShell active="Workspaces" workspaceId={selectedWorkspaceId}>
      <div className="mx-auto max-w-[1080px] pb-10">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
        {inviteLink ? <p role="status" className="mb-4 break-all rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300">Invitation link copied: {inviteLink}</p> : null}
        <div className="flex items-center justify-between pb-6">
          <h1 className="text-[24px] font-semibold text-[#172b4d] dark:text-[#b6c2cf]">Collaborators <span className="ml-2 text-sm text-[#5e6c84] dark:text-[#9fadbc]">{members.length}/10</span></h1>
          {canManageWorkspace ? <button type="button" aria-label="Invite member" onClick={() => setInviteOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-md bg-[#091e420f] text-[#42526e] hover:bg-[#091e4214] dark:bg-[#a1bdd914] dark:text-[#b6c2cf] dark:hover:bg-[#a6c5e229]"><Icon name="plus" size={16} /></button> : null}
        </div>

        <section className="mb-8 rounded-lg border border-[#dfd8f5] bg-[#f4f0ff] p-5 dark:border-[#45404f] dark:bg-[#2c2738]">
          <h2 className="text-[16px] font-semibold text-[#172b4d] dark:text-[#d9d2e9]">Workspace permissions</h2>
          <p className="mt-1 text-sm text-[#42526e] dark:text-[#b6adc9]">{canManageWorkspace ? "As a Workspace admin, you can invite and remove members and change Workspace settings." : "You are a normal Workspace member. You can view this member list and create boards, but only a Workspace admin can invite or remove members and change Workspace settings."}</p>
          {canManageWorkspace ? <><button type="button" onClick={() => setUpgradeMessage((open) => !open)} className="mt-3 text-sm font-medium text-[#8777d9] hover:underline dark:text-[#b8a7f4]">Learn about permissions</button>{upgradeMessage ? <p role="status" className="mt-2 text-xs text-[#5e6c84] dark:text-[#9fadbc]">Admins can invite and remove collaborators, change member roles, manage invitation links, and update workspace settings. The owner cannot be removed or demoted.</p> : null}</> : null}
        </section>

        <div className="overflow-x-auto border-b border-[#091e4224] pb-4 dark:border-[#a6c5e229]">
          <nav className="flex min-w-max gap-6 text-sm font-medium" aria-label="Member types">
            {memberTabs.map((tab) => { const count = tab === "Members" ? members.length : tab === "Single-board guests" ? guests.filter((guest) => guest.boards === 1).length : tab === "Multi-board guests" ? guests.filter((guest) => guest.boards > 1).length : invitations.length; return <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? "border-b-2 border-[#0c66e4] text-[#0c66e4] dark:border-[#579dff] dark:text-[#579dff]" : "text-[#42526e] hover:text-[#172b4d] dark:text-[#9fadbc] dark:hover:text-[#b6c2cf]"} -mb-[18px] pb-2`}>{tab} ({count})</button>; })}
          </nav>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-[#42526e] dark:text-[#9fadbc]">Workspace members can access workspace-visible boards. Guests only access boards where they were invited.</p>
          {canManageWorkspace ? <div className="flex flex-wrap gap-2 self-start"><button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-2 whitespace-nowrap rounded-sm bg-[#0c66e4] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0055cc]"><Icon name="plus" size={16} /> Invite by email</button><button type="button" onClick={createInviteLink} className="rounded-sm bg-[#091e420f] px-3 py-1.5 text-sm font-medium text-[#42526e] hover:bg-[#091e4214] dark:bg-[#a1bdd914] dark:text-[#b6c2cf]">Create invitation link</button></div> : null}
        </div>

        <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Filter by name" className="mt-6 w-full max-w-[300px] rounded-sm border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#6b778c] focus:border-[#4c9aff] focus:outline-none focus:ring-1 focus:ring-[#4c9aff] dark:border-[#738496] dark:bg-[#22272b] dark:text-[#b6c2cf] dark:placeholder:text-[#9fadbc] dark:focus:border-[#85b8ff] dark:focus:ring-[#85b8ff]" />

        <div className="mt-6 border-t border-[#091e4224] dark:border-[#a6c5e229]">
          {activeTab === "Join requests" ? invitations.map((invite) => <div key={invite.id} className="flex flex-col gap-3 border-b border-[#091e4224] py-4 dark:border-[#a6c5e229] sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium">Active invitation link</p><p className="mt-1 truncate text-xs text-[#5e6c84] dark:text-[#9fadbc]">Expires {new Date(invite.expiresAt).toLocaleString()}</p></div><button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${invite.token}`)} className="rounded-md bg-[#e9f2ff] px-3 py-2 text-sm font-semibold text-[#0c66e4] dark:bg-[#1c3d5d] dark:text-[#85b8ff]">Copy link</button>{canManageWorkspace ? <button type="button" onClick={() => revokeInvite(invite.id)} className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-[#c9372c] dark:bg-red-950/40 dark:text-red-300">Revoke</button> : null}</div>) : null}
          {visibleMembers.map((member) => <div key={member.id} className="border-b border-[#091e4224] py-4 dark:border-[#a6c5e229]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff7a59] text-[14px] font-bold text-[#172b4d] shadow-sm">{member.initials}</span><p className="min-w-0 truncate text-[16px] font-medium text-[#172b4d] dark:text-[#b6c2cf]">{member.name} <span className="text-sm font-normal text-[#5e6c84] dark:text-[#9fadbc]">@{member.handle}</span>{member.owner ? <span className="ml-2 rounded bg-[#e9f2ff] px-2 py-1 text-[10px] font-semibold text-[#0c66e4] dark:bg-[#1c3d5d] dark:text-[#85b8ff]">Owner</span> : null}</p></div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end"><button type="button" onClick={() => setExpandedMember((current) => current === member.id ? null : member.id)} className="flex items-center gap-1 text-sm text-[#42526e] hover:text-[#172b4d] dark:text-[#9fadbc] dark:hover:text-[#b6c2cf]">Boards ({member.boards}) <Icon name="chevron-right" size={14} className={expandedMember === member.id ? "-rotate-90" : "rotate-90"} /></button>{canManageWorkspace && activeTab === "Members" && !member.owner ? <select aria-label={`Role for ${member.name}`} value={member.role} onChange={(event) => changeRole(member.id, event.target.value as "admin" | "member")} className="h-8 rounded-md border border-[#b7bec8] bg-white px-2 text-sm capitalize dark:border-[#738496] dark:bg-[#22272b]"><option value="member">Member</option><option value="admin">Admin</option></select> : <span className="text-sm font-medium capitalize text-[#172b4d] dark:text-[#b6c2cf]">{member.owner ? "owner" : member.role}</span>}{canManageWorkspace && activeTab === "Members" && !member.owner ? <button type="button" title="Remove member" onClick={() => removeMember(member.id)} className="rounded-sm bg-[#091e420f] px-3 py-1.5 text-sm font-medium text-[#42526e] hover:bg-[#091e4214] dark:bg-[#a1bdd914] dark:text-[#b6c2cf] dark:hover:bg-[#a6c5e229]">Remove</button> : null}</div>
            </div>
            {expandedMember === member.id ? <p className="mt-3 rounded-md bg-[#f4f5f7] px-4 py-3 text-sm text-[#5e6c84] dark:bg-[#22272b] dark:text-[#9fadbc]">{member.boards ? `Assigned to ${member.boards} workspace boards.` : "Not assigned to a board yet."}</p> : null}
          </div>)}
          {visibleMembers.length === 0 && !(activeTab === "Join requests" && invitations.length) ? <p className="py-10 text-center text-sm text-[#5e6c84] dark:text-[#9fadbc]">No {activeTab.toLowerCase()} found.</p> : null}
        </div>
      </div>

      {inviteOpen && canManageWorkspace ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172b4d]/35 p-4 dark:bg-black/60" onPointerDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}><form onSubmit={(event) => { event.preventDefault(); inviteMember(); }} role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-sm rounded-xl bg-white p-5 text-[#172b4d] shadow-2xl dark:border dark:border-[#454f59] dark:bg-[#282e33] dark:text-[#b6c2cf]"><div className="flex items-center justify-between"><h2 id="invite-title" className="text-lg font-semibold">Invite member</h2><button type="button" aria-label="Close" onClick={() => setInviteOpen(false)} className="rounded p-1 hover:bg-[#091e4214] dark:hover:bg-[#a6c5e229]"><Icon name="x" size={18} /></button></div><label className="mt-5 block text-sm font-medium">Registered user email<input autoFocus type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cfd3da] bg-white px-3 text-[#172b4d] outline-none focus:border-[#0c66e4] dark:border-[#738496] dark:bg-[#22272b] dark:text-[#b6c2cf] dark:focus:border-[#85b8ff]" /></label><button type="submit" disabled={!inviteEmail.trim()} className="mt-5 h-10 w-full rounded-md bg-[#0c66e4] text-sm font-semibold text-white disabled:opacity-45 dark:bg-[#579dff] dark:text-[#0c2444]">Add member</button></form></div> : null}
    </DashboardShell>
  );
}

