"use client";

import { ChevronRight, MapPin, RotateCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { api } from "@/lib/client/api";
import { dateParts, formatTripShort } from "@/lib/client/format";
import { colorHex, type ColorKey } from "@/lib/domain/constants";

export interface MyRoom {
  id: string;
  name: string;
  tripStart: string;
  tripEnd: string | null;
  nickname: string;
  isHost: boolean;
  memberCount: number;
  memberColors: ColorKey[];
  cardCount: number;
  confirmedCount: number;
  decidingCount: number;
}

type RoomsState = { status: "loading" } | { status: "error" } | { status: "ready"; rooms: MyRoom[] };

const fetchRooms = () => api<{ rooms: MyRoom[] }>("/api/auth/me").then((me) => me.rooms);

// 처음에는 이만큼만 보여주고 나머지는 '모두 보기'로 편다
const INITIAL_VISIBLE = 5;
// 카드 왼쪽 날짜 칸의 색 (차례대로 돌려 쓴다)
const DATE_TONES: ColorKey[] = ["coral", "amber", "mint", "sky"];
// 참가자 동그라미는 이만큼까지 그리고 나머지는 +N
const MAX_DOTS = 6;

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

/** 진행 상황 문구. 상태는 글자로 다 읽히고, 색은 핵심 부분만 강조한다 */
function RoomProgress({ room }: { room: MyRoom }) {
  if (room.decidingCount > 0) return <span className="text-coral-strong">결정 중</span>;
  if (room.cardCount === 0) return <span className="text-ink-soft">결정 카드 준비 중</span>;
  if (room.confirmedCount === room.cardCount) return <span className="text-success-ink">일정 확정</span>;
  return (
    <span>
      {room.cardCount}개 중 <span className="text-coral-strong">{room.confirmedCount}개 확정</span>
    </span>
  );
}

function DateStack({ iso }: { iso: string }) {
  const { month, day, weekday } = dateParts(iso);
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="text-[10px] text-ink-soft md:text-xs">{month}</span>
      <span className="mt-1 text-xl font-extrabold md:mt-1.5 md:text-[26px]">{day}</span>
      <span className="mt-1 text-[10px] text-ink-soft md:mt-1.5 md:text-xs">{weekday}</span>
    </span>
  );
}

function RoomCard({ room, tone }: { room: MyRoom; tone: ColorKey }) {
  const hex = colorHex(tone);
  const multiDay = room.tripEnd !== null && room.tripEnd !== room.tripStart;
  const dots = room.memberColors.slice(0, MAX_DOTS);
  const extra = room.memberCount - dots.length;

  return (
    <Link
      href={`/r/${room.id}`}
      className="flex items-stretch overflow-hidden rounded-[var(--radius-card)] border border-line/60 bg-white transition-colors hover:border-ink-faint"
    >
      {/* 날짜 칸: 기간은 본문에서도 읽히므로 화면 읽기에서는 건너뛴다 */}
      <span
        className="relative flex w-[72px] shrink-0 flex-col items-center justify-center gap-4 py-4 pl-2 md:w-[130px] md:gap-3.5 md:py-6 md:pl-3.5"
        style={{ backgroundColor: `${hex}12` }}
        aria-hidden
      >
        <span className="absolute inset-y-0 left-0 w-2 md:w-3.5" style={{ backgroundColor: `${hex}40` }} />
        <DateStack iso={room.tripStart} />
        {multiDay && <DateStack iso={room.tripEnd!} />}
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center py-4 pr-1 pl-4 md:py-7 md:pr-6 md:pl-10">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-lg leading-snug font-bold md:text-[28px]">{room.name}</span>
          {room.isHost && <span className="sr-only">(내가 방장)</span>}
        </span>
        <span className="mt-1 flex items-center gap-2.5 text-[13px] text-ink-soft md:mt-2 md:gap-4 md:text-lg">
          <span className="whitespace-nowrap">{formatTripShort(room.tripStart, room.tripEnd)}</span>
          <span className="h-3 w-px bg-line md:h-4" aria-hidden />
          <span className="whitespace-nowrap">{room.memberCount}명</span>
        </span>
        <span className="mt-2 flex items-center gap-1.5 md:mt-4 md:gap-3" aria-hidden>
          {dots.map((c, i) => (
            <span key={i} className="size-5 shrink-0 rounded-full md:size-8" style={{ backgroundColor: `${colorHex(c)}99` }} />
          ))}
          {extra > 0 && <span className="text-xs font-semibold text-ink-soft md:text-sm">+{extra}</span>}
        </span>
        <span className="mt-2.5 text-[13px] font-semibold md:hidden">
          <RoomProgress room={room} />
        </span>
      </span>

      <span className="my-8 hidden w-[240px] shrink-0 items-center border-l border-line pl-12 text-[22px] font-bold md:flex lg:w-[290px]">
        <RoomProgress room={room} />
      </span>

      <span className="flex shrink-0 items-center pr-3 md:pr-8">
        <ChevronRight className="size-5 text-ink-soft md:size-6" aria-hidden />
      </span>
    </Link>
  );
}

function Section({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <section aria-labelledby="my-rooms-title" aria-busy={busy || undefined}>
      <h2 id="my-rooms-title" className="sr-only">
        내 모임
      </h2>
      {children}
    </section>
  );
}

/** 홈의 내 모임 카드 목록: 날짜 칸, 이름·기간·인원·참가자 색, 진행 상황 */
export function MyRoomsSection() {
  const [state, setState] = useState<RoomsState>({ status: "loading" });
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", rooms: await fetchRooms() });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetchRooms()
      .then((rooms) => alive && setState({ status: "ready", rooms }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <Section busy>
        <p className="sr-only" role="status">
          내 모임을 불러오는 중이에요
        </p>
        <div className="space-y-3 md:space-y-5" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="flex h-[132px] animate-pulse overflow-hidden rounded-[var(--radius-card)] bg-white md:h-[180px]">
              <div className="w-[72px] bg-cream-deep/50 md:w-[130px]" />
              <div className="flex-1 space-y-3 p-4 md:px-10 md:py-8">
                <div className="h-5 w-1/2 rounded-full bg-cream-deep md:h-7" />
                <div className="h-3.5 w-1/3 rounded-full bg-cream-deep md:h-4" />
                <div className="h-5 w-24 rounded-full bg-cream-deep md:h-8 md:w-40" />
              </div>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  if (state.status === "error") {
    return (
      <Section>
        <div role="alert" className="rounded-[var(--radius-card)] border border-line/60 bg-white p-5">
          <p className="text-sm text-ink-soft">모임 목록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.</p>
          <Button variant="secondary" size="sm" className="mt-3" icon={<RotateCw className="size-4" aria-hidden />} onClick={load}>
            다시 불러오기
          </Button>
        </div>
      </Section>
    );
  }

  const { rooms } = state;
  if (rooms.length === 0) {
    return (
      <Section>
        <EmptyState
          icon={<MapPin className="size-6" aria-hidden />}
          title="아직 참여한 모임이 없어요"
          description="모임을 만들거나 초대 코드로 참여하면 여기에 모여요."
        />
      </Section>
    );
  }

  const sorted = sortRooms(rooms);
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  return (
    <Section>
      <ul className="space-y-3 md:space-y-5">
        {visible.map((r, i) => (
          <li key={r.id}>
            <RoomCard room={r} tone={DATE_TONES[i % DATE_TONES.length]} />
          </li>
        ))}
      </ul>
      {rooms.length > INITIAL_VISIBLE && (
        <Button variant="ghost" size="sm" block className="mt-2" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "접기" : `모두 보기 (${rooms.length}개)`}
        </Button>
      )}
    </Section>
  );
}
