import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-coral-soft text-coral-strong">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">길을 잃었어요</h1>
      <p className="mt-1 text-ink-soft">주소가 바뀌었거나 없는 페이지예요.</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-coral-strong px-5 font-semibold text-white">
        처음 화면으로
      </Link>
    </main>
  );
}
