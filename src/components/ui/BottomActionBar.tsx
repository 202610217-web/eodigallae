import type { ReactNode } from "react";
import { cn } from "@/lib/client/cn";

/** 모바일 하단 고정 주요 행동 영역. md 이상에서는 일반 흐름 안에 놓인다. */
export function BottomActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      <div className="h-24 md:hidden" aria-hidden />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
