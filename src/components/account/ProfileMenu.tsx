"use client";

import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { useAccount } from "./useAccount";

/**
 * 오른쪽 위 프로필 버튼. 누르면 프로필 설정·계정 설정·로그아웃 메뉴가 열린다.
 * 링크 몇 개를 펼치는 목록이라 메뉴(role="menu") 대신 펼침 버튼 + 일반 링크로 둔다(Tab으로 이동).
 */
export function ProfileMenu({ compact = false }: { compact?: boolean }) {
  const { account } = useAccount();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    // Esc로 닫으면 포커스를 프로필 버튼으로 되돌린다
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
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
  const needsRecovery = !account.hasRecovery;
  return (
    <div
      ref={ref}
      className="relative shrink-0"
      // Tab으로 메뉴 밖으로 나가면 닫는다
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${account.nickname} 프로필 메뉴${needsRecovery ? " (복구 코드를 아직 만들지 않았어요)" : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex min-h-11 items-center gap-1.5 rounded-xl px-1 hover:bg-cream-deep"
      >
        <Avatar character={account.character} color={account.color} size="sm" />
        {!compact && <span className="hidden max-w-28 truncate text-sm font-semibold md:inline">{account.nickname}</span>}
        <ChevronDown className="size-4 text-ink-faint" aria-hidden />
        {needsRecovery && <span className="absolute top-1.5 left-7 size-2.5 rounded-full border-2 border-cream bg-coral-strong" aria-hidden />}
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-white p-2 animate-rise-in">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar character={account.character} color={account.color} size="md" />
            <div className="min-w-0">
              <p className="truncate font-bold">{account.nickname}</p>
              <p className="truncate text-xs text-ink-soft">@{account.username}</p>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          <Link href="/settings/profile" className={item} onClick={() => setOpen(false)}>
            <UserRound className="size-4 text-ink-soft" aria-hidden /> 프로필 설정
          </Link>
          <Link href="/settings/account" className={item} onClick={() => setOpen(false)}>
            <Settings className="size-4 text-ink-soft" aria-hidden />
            <span className="flex-1">계정 설정</span>
            {needsRecovery && (
              <span className="rounded-full bg-coral-soft px-2 py-0.5 text-xs font-semibold text-[#b9412c]">복구 코드 만들기</span>
            )}
          </Link>
          <button type="button" className={cn(item, "text-ink-soft")} disabled={loggingOut} onClick={logout}>
            <LogOut className="size-4" aria-hidden /> {loggingOut ? "로그아웃하는 중…" : "로그아웃"}
          </button>
        </div>
      )}
    </div>
  );
}
