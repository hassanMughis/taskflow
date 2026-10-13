
import type { Metadata } from "next";
import { Suspense } from "react";
import { RoutePreloader } from "./components/route-preloader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kanvero",
    template: "%s | Kanvero",
  },
  description: "Create your Kanvero account and bring your team's work together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('kanvero_theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d&&t==='light')}catch(e){}})()` }} />
      </head>
      <body
        className="min-h-full bg-[#f7f8f9] font-sans text-[#172b4d] antialiased dark:bg-[#1d1f21] dark:text-[#f1f2f4]"
        suppressHydrationWarning
      >
        <Suspense fallback={null}>
          <RoutePreloader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
