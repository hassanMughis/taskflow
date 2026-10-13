import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return <main className="min-h-screen bg-[#f7f8f9] px-5 py-12 text-[#172b4d] dark:bg-[#1d1f21] dark:text-[#f1f2f4]"><article className="mx-auto max-w-3xl rounded-xl border border-[#dcdfe4] bg-white p-6 shadow-sm dark:border-[#454f59] dark:bg-[#22272b] sm:p-10"><h1 className="text-3xl font-semibold">Terms of Service</h1><p className="mt-2 text-sm text-[#626f86] dark:text-[#9fadbc]">Frontend draft for Kanvero</p><div className="mt-8 space-y-6 text-sm leading-7 text-[#44546f] dark:text-[#b6c2cf]"><section><h2 className="font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Using Kanvero</h2><p>You are responsible for the content you create, upload, and share. Do not use the service for unlawful, harmful, or abusive activity.</p></section><section><h2 className="font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Your account</h2><p>Keep your login information secure and notify the service administrator if you believe your account has been compromised.</p></section><section><h2 className="font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Service changes</h2><p>Features may change as the application is developed. Production terms should be reviewed before public launch.</p></section></div><Link href="/" className="mt-8 inline-flex text-sm font-semibold text-[#0c66e4] hover:underline dark:text-[#579dff]">Back to registration</Link></article></main>;
}

