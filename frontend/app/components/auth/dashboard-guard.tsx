"use client";

import { useEffect, useState } from "react";

type DashboardGuardProps = {
  children: React.ReactNode;
};

export function DashboardGuard({ children }: DashboardGuardProps) {
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;
    const token = localStorage.getItem("kanvero_token");

    if (!token) {
      window.location.replace("/login");
      return;
    }

    async function verifySession() {
      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Session is not valid");
        }

        if (isActive) {
          setIsCheckingSession(false);
        }
      } catch {
        localStorage.removeItem("kanvero_token");
        localStorage.removeItem("kanvero_user");
        window.location.replace("/login");
      }
    }

    verifySession();

    return () => {
      isActive = false;
    };
  }, []);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f9] text-sm text-[#44546f] dark:bg-[#1d1f21] dark:text-[#b6c2cf]">
        Checking your session…
      </main>
    );
  }

  return children;
}

