import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#f7f8f9] px-5 py-12 text-[#172b4d] dark:bg-[#1d1f21] dark:text-[#f1f2f4]"><article className="mx-auto max-w-3xl rounded-xl border border-[#dcdfe4] bg-white p-6 shadow-sm dark:border-[#454f59] dark:bg-[#22272b] sm:p-10"><h1 className="text-3xl font-semibold">Privacy Policy</h1><p className="mt-2 text-sm text-[#626f86] dark:text-[#9fadbc]">Kanvero privacy overview</p><div className="mt-8 space-y-6 text-sm leading-7 text-[#44546f] dark:text-[#b6c2cf]"><section><h2 className="font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Information collected</h2><p>Kanvero stores account details and workspace content needed to provide boards, cards, memberships, and notifications.</p></section><section><h2 className="font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Data storage</h2><p>Workspace and board content is stored by the Kanvero API. The browser stores the authentication token and signed-in user details needed for the current session.</p></section><section><h2 className="font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Your choices</h2><p>You may request access, correction, or deletion of your account data.</p></section></div><Link href="/" className="mt-8 inline-flex text-sm font-semibold text-[#0c66e4] hover:underline dark:text-[#579dff]">Back to registration</Link></article></main>;
}

