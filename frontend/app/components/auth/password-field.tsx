"use client";

import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  label: string;
  hint?: string;
  autoComplete?: "new-password" | "current-password";
};

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.5 10.5 0 0 1 12 4c5.4 0 9 5.5 9 5.5a15.5 15.5 0 0 1-2.4 3M6.6 6.6C4.3 8.1 3 9.5 3 9.5S6.6 15 12 15c1 0 2-.2 2.9-.5" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M3 12s3.6-5.5 9-5.5 9 5.5 9 5.5-3.6 5.5-9 5.5S3 12 3 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function LockIcon({ confirm }: { confirm: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {confirm ? <path d="M7.5 7.5A7 7 0 1 1 5 12.8M5 7.5v5h5" /> : null}
      <rect x="7" y="10" width="10" height="9" rx="1.5" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3M12 14v2" />
    </svg>
  );
}

export function PasswordField({
  id,
  label,
  hint,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1 lg:space-y-2">
      <label className="block text-sm font-medium text-[#172b4d] dark:text-[#f1f2f4]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-[#7d7e90] dark:text-[#9fadbc] lg:hidden">
          <span className="h-5 w-5 [&_svg]:h-full [&_svg]:w-full [&_svg]:stroke-current [&_svg]:stroke-2 [&_svg]:stroke-linecap-round [&_svg]:stroke-linejoin-round">
            <LockIcon confirm={id === "confirmPassword"} />
          </span>
        </span>
        <input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="block h-[42px] w-full rounded-md border border-[#b7bec8] bg-white pl-10 pr-12 text-base text-[#44546f] outline-none transition placeholder:text-[#626f86] hover:border-[#8590a2] focus:border-[#0c66e4] focus:shadow-[0_0_0_3px_rgba(12,102,228,0.12)] dark:border-[#626f86] dark:bg-[#1d2125] dark:text-[#f1f2f4] dark:placeholder:text-[#9fadbc] lg:h-[46px] lg:rounded-lg lg:pl-[15px] lg:text-sm lg:text-[#172b4d] lg:placeholder:text-[#626f86] lg:dark:text-[#f1f2f4] lg:dark:placeholder:text-[#9fadbc]"
        />
        <button
          type="button"
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((visible) => !visible)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#626f86] transition hover:text-[#0c66e4] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#0c66e4] dark:text-[#9fadbc] dark:hover:text-[#579dff]"
        >
          <span className="h-5 w-5 [&_svg]:h-full [&_svg]:w-full [&_svg]:stroke-current [&_svg]:stroke-[1.8] [&_svg]:stroke-linecap-round [&_svg]:stroke-linejoin-round">
            <EyeIcon hidden={!showPassword} />
          </span>
        </button>
      </div>
      {hint ? (
        <p className="text-xs text-[#44546f] dark:text-[#b6c2cf] lg:flex lg:items-center lg:gap-1.5 lg:text-sm">
          <span
            aria-hidden="true"
            className="hidden h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold lg:flex"
          >
            i
          </span>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

