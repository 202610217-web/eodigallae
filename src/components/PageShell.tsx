import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** 시작·생성·참여 화면이 함께 쓰는 좁은 단일 열 레이아웃 */
export function PageShell({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-8 md:pt-10">
      <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden /> 처음으로
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold md:text-[28px]">{title}</h1>
      {description && <div className="mt-1 text-ink-soft">{description}</div>}
      <div className="mt-6">{children}</div>
    </main>
  );
}
