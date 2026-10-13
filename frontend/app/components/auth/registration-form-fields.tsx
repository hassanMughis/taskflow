"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiPost } from "../../lib/api-client";
import { FormField } from "./form-field";
import { PasswordField } from "./password-field";

export function RegistrationFormFields() {
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
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const acceptedTerms = formData.get("terms") === "on";

    if (!name || !email || !password || !confirmPassword) {
      setStatus({ type: "error", message: "Please complete every field." });
      return;
    }

    if (password.length < 8) {
      setStatus({
        type: "error",
        message: "Password must be at least 8 characters long.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    if (!acceptedTerms) {
      setStatus({
        type: "error",
        message: "Please accept the Terms of Service and Privacy Policy.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiPost<{ message?: string }>("/auth/register", { name, email, password }, false);

      form.reset();
      setStatus({
        type: "success",
        message: data?.message || "Account created successfully.",
      });
      const requested = new URLSearchParams(window.location.search).get("next");
      const loginUrl = requested?.startsWith("/") && !requested.startsWith("//") ? `/login?next=${encodeURIComponent(requested)}` : "/login";
      window.setTimeout(() => window.location.replace(loginUrl), 900);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create your account. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5" noValidate>
      <FormField
        id="name"
        label="Full Name"
        type="text"
        placeholder="Jane Doe"
        autoComplete="name"
        icon="user"
      />
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
        hint="Must be at least 8 characters."
      />
      <PasswordField id="confirmPassword" label="Confirm Password" />

      <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm leading-5 text-[#555663] dark:text-[#b6c2cf]">
        <input
          type="checkbox"
          name="terms"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#b7bec8] accent-[#0c66e4]"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-[#0c66e4] hover:underline dark:text-[#579dff]">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#0c66e4] hover:underline dark:text-[#579dff]">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </div>
    </form>
  );
}

