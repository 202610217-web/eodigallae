import type { ReactNode } from "react";
import { Logo } from "@/components/room/RoomHeader";

/** 로그인·회원가입 전용 화면. 로그인 전에는 다른 화면으로 갈 수 없으므로 뒤로가기 링크 없이 단독으로 보인다. */
export function AuthShell({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pt-10 pb-8 md:pt-16">
      <div className="mb-6 text-center">
        <Logo />
        <p className="mt-3 text-sm font-semibold text-coral-strong">취향은 모으고, 결정은 함께!</p>
        <h1 className="mt-5 text-2xl font-extrabold md:text-[28px]">{title}</h1>
        <p className="mt-1 text-ink-soft">{description}</p>
      </div>
      {children}
    </main>
  );
}
