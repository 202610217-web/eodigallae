"use client";

import { ChevronRight, Crown, LogIn, LogOut, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/client/api";

interface MyRoom {
  id: string;
  name: string;
  tripStart: string;
  tripEnd: string | null;
  nickname: string;
  isHost: boolean;
}

interface Me {
  user: { username: string } | null;
  rooms: MyRoom[];
}

/** 홈 화면의 계정 영역. 로그인하지 않았으면 가입 안내, 로그인했으면 내 모임 목록을 보여준다. */
export function AccountPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Me>("/api/auth/me")
      .then((data) => alive && setMe(data))
      .catch(() => alive && setMe({ user: null, rooms: [] }));
    return () => {
      alive = false;
    };
  }, []);

  if (!me) return null;

  if (!me.user) {
    return (
      <section className="rounded-[var(--radius-card)] bg-white p-5">
        <p className="flex items-center gap-2 font-bold">
          <UserRound className="size-4 text-ink-soft" aria-hidden /> 다른 기기에서도 이어서 하려면
        </p>
        <p className="mt-1 text-sm text-ink-soft">가입은 선택이에요. 로그인하면 내 모임 목록이 생기고, 휴대폰·PC 어디서든 같은 참가자로 들어올 수 있어요.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-ink transition-colors hover:bg-cream"
          >
            <LogIn className="size-4" aria-hidden /> 로그인
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral-strong px-4 font-semibold text-white transition-colors hover:bg-[#d84a33]"
          >
            <UserPlus className="size-4" aria-hidden /> 회원가입
          </Link>
        </div>
      </section>
    );
  }

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-ink-soft">
          <span className="text-ink">{me.user.username}</span>님의 모임
        </h2>
        <Button size="sm" variant="ghost" loading={loggingOut} icon={<LogOut className="size-3.5" aria-hidden />} onClick={logout}>
          로그아웃
        </Button>
      </div>
      {me.rooms.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">아직 참여한 모임이 없어요. 모임을 만들거나 초대 코드로 참여해보세요.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {me.rooms.map((r) => (
            <li key={r.id}>
              <Link href={`/r/${r.id}`} className="flex min-h-14 items-center gap-2 py-1">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{r.name}</span>
                    {r.isHost && <Crown className="size-3.5 shrink-0 text-[#B7860B]" aria-label="방장" />}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">
                    {r.tripStart}
                    {r.tripEnd && r.tripEnd !== r.tripStart ? ` ~ ${r.tripEnd}` : ""} · {r.nickname}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
