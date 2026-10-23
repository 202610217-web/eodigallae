"use client";

import { CircleAlert } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger text-danger-ink">
        <CircleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">문제가 생겼어요</h1>
      <p className="mt-1 text-ink-soft">잠시 후 다시 시도해주세요.</p>
      <button type="button" onClick={reset} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-coral-strong px-5 font-semibold text-white">
        다시 시도
      </button>
    </main>
  );
}
