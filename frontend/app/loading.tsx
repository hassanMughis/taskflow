import { KanveroLoaderLogo } from "./components/kanvero-loader-logo";

export default function Loading() {
  return (
    <main className="fixed inset-0 z-[9998] flex items-center justify-center bg-white dark:bg-[#1d1f21]">
      <div className="flex flex-col items-center">
        <KanveroLoaderLogo className="w-[220px] text-[#172b4d] dark:text-[#f1f2f4]" />
        <span className="kanvero-loader-track mt-5 h-1 w-28 overflow-hidden rounded-full bg-[#dfe1e6] dark:bg-[#3d4145]">
          <span className="kanvero-loader-bar block h-full w-1/2 rounded-full bg-[#0c66e4] dark:bg-[#579dff]" />
        </span>
      </div>
    </main>
  );
}
