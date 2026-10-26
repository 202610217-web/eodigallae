"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { MyRooms, MyRoomsError, MyRoomsLoading, type MyRoom } from "./MyRooms";

type RoomsState = { status: "loading" } | { status: "error" } | { status: "ready"; rooms: MyRoom[] };

const fetchRooms = () => api<{ rooms: MyRoom[] }>("/api/auth/me").then((me) => me.rooms);

/**
 * 홈 배치.
 * - 내 모임이 있으면(또는 불러오는 중이면): 좁은 화면은 소개 → 내 모임 → 만들기·참여 → 안내 순서,
 *   넓은 화면은 왼쪽에 소개·만들기·참여·안내, 오른쪽에 내 모임.
 * - 내 모임이 없으면: 넓은 화면 오른쪽 칸을 안내 카드가 채운다.
 */
export function HomeLayout({ hero, actions, guide }: { hero: ReactNode; actions: ReactNode; guide: ReactNode }) {
  const [state, setState] = useState<RoomsState>({ status: "loading" });

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

  const showRooms = state.status !== "ready" || state.rooms.length > 0;

  return (
    <div
      className={cn(
        "mt-7 grid grid-cols-1 gap-6 md:mt-10 lg:mt-12 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-6",
        showRooms ? "lg:grid-rows-[auto_auto_1fr]" : "lg:grid-rows-[auto_1fr]",
      )}
    >
      <div className="lg:col-start-1 lg:row-start-1">{hero}</div>
      {showRooms && (
        <div className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          {state.status === "loading" && <MyRoomsLoading />}
          {state.status === "error" && <MyRoomsError onRetry={load} />}
          {state.status === "ready" && <MyRooms rooms={state.rooms} />}
        </div>
      )}
      <div className="lg:col-start-1 lg:row-start-2 lg:self-start">{actions}</div>
      <div className={cn("lg:self-start", showRooms ? "lg:col-start-1 lg:row-start-3" : "lg:col-start-2 lg:row-span-2 lg:row-start-1")}>
        {guide}
      </div>
    </div>
  );
}
