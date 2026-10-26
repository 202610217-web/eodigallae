"use client";

import { ChevronRight, CircleCheck, CircleDashed, Crown, ListChecks, RotateCw, Users, Vote } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/StatusBadge";
import { formatTrip } from "@/lib/client/format";

export interface MyRoom {
  id: string;
  name: string;
  tripStart: string;
  tripEnd: string | null;
  nickname: string;
  isHost: boolean;
  memberCount: number;
  cardCount: number;
  confirmedCount: number;
  decidingCount: number;
}

// 처음에는 이만큼만 보여주고 나머지는 '모두 보기'로 편다
const INITIAL_VISIBLE = 5;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 다가오는 여행을 가까운 순으로 먼저, 지난 여행은 최근 순으로 뒤에 */
function sortRooms(rooms: MyRoom[]): MyRoom[] {
  const today = todayIso();
  const upcoming = rooms.filter((r) => (r.tripEnd ?? r.tripStart) >= today).sort((a, b) => a.tripStart.localeCompare(b.tripStart));
  const past = rooms.filter((r) => (r.tripEnd ?? r.tripStart) < today).sort((a, b) => b.tripStart.localeCompare(a.tripStart));
  return [...upcoming, ...past];
}

function RoomProgress({ room }: { room: MyRoom }) {
  if (room.decidingCount > 0) {
    return (
      <Pill tone="coral" icon={<Vote className="size-3.5" aria-hidden />}>
        결정 중
      </Pill>
    );
  }
  if (room.cardCount === 0) {
    return (
      <Pill tone="neutral" icon={<CircleDashed className="size-3.5" aria-hidden />}>
        결정 카드 준비 중
      </Pill>
    );
  }
  if (room.confirmedCount === room.cardCount) {
    return (
      <Pill tone="success" icon={<CircleCheck className="size-3.5" aria-hidden />}>
        일정 확정
      </Pill>
    );
  }
  return (
    <Pill tone="info" icon={<ListChecks className="size-3.5" aria-hidden />}>
      {room.cardCount}개 중 {room.confirmedCount}개 확정
    </Pill>
  );
}

function Panel({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <section aria-labelledby="my-rooms-title" aria-busy={busy || undefined} className="rounded-[var(--radius-card)] bg-white p-5">
      {children}
    </section>
  );
}

function Title({ count }: { count?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 id="my-rooms-title" className="text-lg font-bold">
        내 모임
      </h2>
      {count !== undefined && <span className="text-sm text-ink-soft">{count}개</span>}
    </div>
  );
}

/** 홈의 내 모임 목록: 이름·날짜·내 닉네임과 함께 진행 상황을 보여준다 */
export function MyRooms({ rooms }: { rooms: MyRoom[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = sortRooms(rooms);
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE);

  return (
    <Panel>
      <Title count={rooms.length} />
      <ul className="-mx-2 mt-2">
        {visible.map((r) => (
          <li key={r.id}>
            <Link href={`/r/${r.id}`} className="flex min-h-16 items-center gap-2 rounded-xl px-2 py-3 transition-colors hover:bg-cream">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="truncate">{r.name}</span>
                  {r.isHost && (
                    <>
                      <Crown className="size-3.5 shrink-0 text-[#B7860B]" aria-hidden />
                      <span className="sr-only">(방장)</span>
                    </>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-ink-soft">
                  {formatTrip(r.tripStart, r.tripEnd)} · {r.nickname}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <RoomProgress room={r} />
                  <Pill tone="neutral" icon={<Users className="size-3.5" aria-hidden />}>
                    {r.memberCount}명
                  </Pill>
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {rooms.length > INITIAL_VISIBLE && (
        <Button variant="ghost" size="sm" block className="mt-2" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "접기" : `모두 보기 (${rooms.length}개)`}
        </Button>
      )}
    </Panel>
  );
}

export function MyRoomsLoading() {
  return (
    <Panel busy>
      <Title />
      <p className="sr-only" role="status">
        내 모임을 불러오는 중이에요
      </p>
      <div className="mt-3 space-y-4" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 w-2/3 rounded-full bg-cream-deep" />
            <div className="h-3 w-1/2 rounded-full bg-cream-deep" />
            <div className="h-6 w-28 rounded-full bg-cream-deep" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function MyRoomsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Panel>
      <Title />
      <div role="alert" className="mt-2">
        <p className="text-sm text-ink-soft">모임 목록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.</p>
        <Button variant="secondary" size="sm" className="mt-3" icon={<RotateCw className="size-4" aria-hidden />} onClick={onRetry}>
          다시 불러오기
        </Button>
      </div>
    </Panel>
  );
}
