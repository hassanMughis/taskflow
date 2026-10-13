"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiPost } from "../../lib/api-client";
import { FormField } from "./form-field";
import { PasswordField } from "./password-field";

type LoginResponse = {
  message?: string;
  token?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
};

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setStatus({ type: "error", message: "Email and password are required." });
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiPost<LoginResponse>("/auth/login", { email, password }, false);

      if (!data?.token) {
        throw new Error("The server did not return an authentication token.");
      }

      localStorage.setItem("kanvero_token", data.token);
      localStorage.setItem("kanvero_user", JSON.stringify(data.user ?? null));
      form.reset();
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
      window.location.replace(destination);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to sign in. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-4 py-12 dark:bg-[#1d1f21] lg:bg-transparent lg:px-14 lg:py-10">
      <div className="w-full max-w-[358px] rounded-xl border border-[#dddddf] bg-white px-6 pb-6 pt-12 shadow-[0_3px_5px_rgba(0,0,0,0.13)] dark:border-transparent dark:bg-transparent dark:shadow-none lg:max-w-[420px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <Image
          src="/image_3-removebg-preview.png"
          alt="Kanvero"
          width={230}
          height={74}
          priority
          className="mx-auto mb-[53px] h-auto w-[60px] object-contain dark:brightness-0 dark:invert lg:hidden"
        />

        <header className="mb-8 text-center lg:text-left">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.035em] text-[#172b4d] dark:text-[#f1f2f4] sm:text-[34px] lg:text-[36px]">
            Welcome back
          </h1>
          <p className="mt-2 text-[16px] text-[#44546f] dark:text-[#b6c2cf]">
            Pick up where you left off.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5" noValidate>
          <FormField
            id="email"
            label="Email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            icon="email"
          />
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
          />

          {status ? (
            <p
              aria-live="polite"
              className={
                status.type === "success"
                  ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-[#183b31] dark:text-[#7ee2b8]"
                  : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-[#42221f] dark:text-[#ff9c8f]"
              }
            >
              {status.message}
            </p>
          ) : null}

          <div className="border-b border-[#e1e1e1] pb-[22px] dark:border-[#454f59] lg:border-0 lg:pb-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-[46px] w-full cursor-pointer rounded-md bg-[#0c66e4] text-sm font-semibold text-white shadow-[0_8px_22px_rgba(12,102,228,0.18)] transition hover:bg-[#0055cc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c66e4] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 lg:rounded-lg"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <p className="mt-7 text-center text-sm text-[#44546f] dark:text-[#b6c2cf] lg:mt-14">
          Don&apos;t have an account?{" "}
          <Link href="/" className="font-medium text-[#0c66e4] hover:underline dark:text-[#579dff]">
            Create account
          </Link>
        </p>
      </div>
    </section>
  );
}

