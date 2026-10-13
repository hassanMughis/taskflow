"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch } from "../../lib/api-client";
import { DashboardShell } from "../dashboard/dashboard-shell";

type User = { id: string; name: string; email: string };
const inputClass = "mt-2 h-10 w-full rounded-md border border-[#b7bec8] bg-white px-3 text-sm text-[#172b4d] outline-none focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4] dark:border-[#738496] dark:bg-[#22272b] dark:text-[#f1f2f4]";

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    apiGet<{ user: User }>("/auth/me").then(({ user: loadedUser }) => {
      setUser(loadedUser); setName(loadedUser.name); setEmail(loadedUser.email);
    }).catch((error: Error) => setProfileMessage(error.message));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingProfile(true); setProfileMessage("");
    try {
      const result = await apiPatch<{ user: User }>("/auth/me", { name, email });
      setUser(result.user); setName(result.user.name); setEmail(result.user.email);
      localStorage.setItem("kanvero_user", JSON.stringify(result.user));
      setProfileMessage("Profile saved.");
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "Profile could not be saved."); }
    finally { setSavingProfile(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingPassword(true); setPasswordMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) { setPasswordMessage("New passwords do not match."); setSavingPassword(false); return; }
    try {
      await apiPatch("/auth/password", { currentPassword, newPassword });
      formElement.reset(); setPasswordMessage("Password updated.");
    } catch (error) { setPasswordMessage(error instanceof Error ? error.message : "Password could not be updated."); }
    finally { setSavingPassword(false); }
  }

  return <DashboardShell active="Settings">
    <div className="mx-auto max-w-3xl pb-12">
      <header><h1 className="text-3xl font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Account settings</h1><p className="mt-2 text-sm text-[#626f86] dark:text-[#9fadbc]">Manage your profile, sign-in email, and password.</p></header>
      <form onSubmit={saveProfile} className="mt-8 rounded-xl border border-[#dcdfe4] bg-white p-6 shadow-sm dark:border-[#454f59] dark:bg-[#22272b]">
        <h2 className="text-lg font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Profile</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]">Full name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label></div>
        {profileMessage ? <p role="status" className="mt-4 text-sm text-[#44546f] dark:text-[#b6c2cf]">{profileMessage}</p> : null}
        <button type="submit" disabled={!user || savingProfile || !name.trim() || !email.trim()} className="mt-5 h-10 rounded-md bg-[#0c66e4] px-4 text-sm font-semibold text-white hover:bg-[#0055cc] disabled:opacity-50">{savingProfile ? "Saving…" : "Save profile"}</button>
      </form>
      <form onSubmit={savePassword} className="mt-6 rounded-xl border border-[#dcdfe4] bg-white p-6 shadow-sm dark:border-[#454f59] dark:bg-[#22272b]">
        <h2 className="text-lg font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Change password</h2><p className="mt-1 text-sm text-[#626f86] dark:text-[#9fadbc]">Use at least eight characters.</p>
        <div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]">Current password<input required name="currentPassword" type="password" autoComplete="current-password" className={inputClass} /></label><label className="block text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]">New password<input required minLength={8} maxLength={128} name="newPassword" type="password" autoComplete="new-password" className={inputClass} /></label><label className="block text-sm font-semibold text-[#44546f] dark:text-[#b6c2cf]">Confirm new password<input required minLength={8} maxLength={128} name="confirmPassword" type="password" autoComplete="new-password" className={inputClass} /></label></div>
        {passwordMessage ? <p role="status" className="mt-4 text-sm text-[#44546f] dark:text-[#b6c2cf]">{passwordMessage}</p> : null}
        <button type="submit" disabled={savingPassword} className="mt-5 h-10 rounded-md bg-[#0c66e4] px-4 text-sm font-semibold text-white hover:bg-[#0055cc] disabled:opacity-50">{savingPassword ? "Updating…" : "Update password"}</button>
      </form>
    </div>
  </DashboardShell>;
}
