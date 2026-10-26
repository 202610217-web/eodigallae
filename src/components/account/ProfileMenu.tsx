"use client";

import { ChevronDown, LogOut, Settings, ShieldAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { useAccount } from "./useAccount";

/** 오른쪽 위 프로필 버튼. 누르면 프로필 설정·계정 설정·로그아웃 메뉴가 열린다. */
export function ProfileMenu({ compact = false }: { compact?: boolean }) {
  const { account } = useAccount();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!account) return <span className="size-11 shrink-0" aria-hidden />;

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const item = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[15px] font-semibold hover:bg-cream";
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${account.nickname} 프로필 메뉴`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex min-h-11 items-center gap-1.5 rounded-xl px-1 hover:bg-cream-deep"
      >
        <Avatar character={account.character} color={account.color} size="sm" />
        {!compact && <span className="hidden max-w-28 truncate text-sm font-semibold md:inline">{account.nickname}</span>}
        <ChevronDown className="size-4 text-ink-faint" aria-hidden />
        {!account.hasRecovery && <span className="absolute top-1.5 left-7 size-2.5 rounded-full border-2 border-cream bg-coral-strong" aria-label="확인할 설정이 있어요" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-white p-2 animate-rise-in">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar character={account.character} color={account.color} size="md" />
            <div className="min-w-0">
              <p className="truncate font-bold">{account.nickname}</p>
              <p className="truncate text-xs text-ink-soft">@{account.username}</p>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href="/settings/profile" className={item} onClick={() => setOpen(false)}>
            <UserRound className="size-4 text-ink-soft" aria-hidden /> 프로필 설정
          </Link>
          <Link role="menuitem" href="/settings/account" className={item} onClick={() => setOpen(false)}>
            <Settings className="size-4 text-ink-soft" aria-hidden />
            <span className="flex-1">계정 설정</span>
            {!account.hasRecovery && <ShieldAlert className="size-4 text-coral-strong" aria-label="복구 코드 없음" />}
          </Link>
          <button role="menuitem" type="button" className={cn(item, "text-ink-soft")} disabled={loggingOut} onClick={logout}>
            <LogOut className="size-4" aria-hidden /> {loggingOut ? "로그아웃하는 중…" : "로그아웃"}
          </button>
        </div>
      )}
    </div>
  );
}
