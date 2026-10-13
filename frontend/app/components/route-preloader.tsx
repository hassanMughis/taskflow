"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KanveroLoaderLogo } from "./kanvero-loader-logo";

export function RoutePreloader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [loading, setLoading] = useState(false);
  const [animationRun, setAnimationRun] = useState(0);
  const pageReady = useRef(false);
  const previousRoute = useRef(routeKey);
  const closeTimer = useRef<number | null>(null);
  const safetyTimer = useRef<number | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${destination.pathname}${destination.search}`;
      if (current === next) return;

      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
      pageReady.current = false;
      setAnimationRun((current) => current + 1);
      setLoading(true);
      safetyTimer.current = window.setTimeout(() => setLoading(false), 30000);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);

  useEffect(() => {
    if (previousRoute.current === routeKey) return;
    previousRoute.current = routeKey;
    if (!loading) return;
    pageReady.current = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = window.setTimeout(
      () => setLoading(false),
      reducedMotion ? 150 : 2000,
    );
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [routeKey, loading]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
  }, []);

  return (
    <div
      aria-hidden={!loading}
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white/96 backdrop-blur-sm transition-opacity duration-150 dark:bg-[#1d1f21]/96 ${loading ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div key={animationRun} className="flex flex-col items-center">
        <div
          onAnimationIteration={(event) => {
            if (event.animationName === "kanveroLogoWord" && pageReady.current) {
              if (closeTimer.current) window.clearTimeout(closeTimer.current);
              setLoading(false);
            }
          }}
        >
          <KanveroLoaderLogo className="w-[220px] text-[#172b4d] dark:text-[#f1f2f4]" />
        </div>
        <span className="kanvero-loader-track mt-5 h-1 w-28 overflow-hidden rounded-full bg-[#dfe1e6] dark:bg-[#3d4145]">
          <span className="kanvero-loader-bar block h-full w-1/2 rounded-full bg-[#0c66e4] dark:bg-[#579dff]" />
        </span>
        <span className="sr-only">Loading page</span>
      </div>
    </div>
  );
}
