"use client";

import { ChevronRight, Crown, LogOut } from "lucide-react";
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

/** 홈 화면의 계정 영역: 내 계정에 연결된 모임 목록과 로그아웃 */
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

  // 홈은 로그인해야 들어올 수 있으므로 로그인 정보가 없으면(세션 만료 등) 아무것도 그리지 않는다
  if (!me?.user) return null;

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
