"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { api, ApiError } from "@/lib/client/api";
import type { RoomView } from "@/lib/domain/types";
import type { RoomAction } from "@/lib/validation";

// 실시간 서비스 대신 주기적 조회(polling)로 다른 참가자의 변경을 반영한다.
// 모든 변경은 서버에 먼저 저장되고, 저장 직후 상태를 다시 불러온다.

const SLOW_POLL_MS = 3000;
const FAST_POLL_MS = 1000;

interface Toast {
  id: number;
  tone: "success" | "error";
  text: string;
}

interface RoomContextValue {
  view: RoomView;
  /** 서버 시각 - 브라우저 시각 (게임 타이머 동기화용) */
  clockOffset: number;
  act: (action: RoomAction) => Promise<boolean>;
  refresh: () => Promise<void>;
  toast: (text: string, tone?: Toast["tone"]) => void;
  /** 방금 확정된 카드 id (보드 카드 피드백 애니메이션용) */
  justConfirmed: string | null;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("RoomProvider 안에서만 사용할 수 있어요");
  return ctx;
}

export type LoadError = { status: number; message: string; code?: string };

export function RoomProvider({
  roomId,
  children,
  Fallback,
}: {
  roomId: string;
  children: ReactNode;
  Fallback: ComponentType<{ loading: boolean; error: LoadError | null; retry: () => void }>;
}) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);
  const seq = useRef(0);
  const prevView = useRef<RoomView | null>(null);
  const toastId = useRef(0);

  const toast = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const refresh = useCallback(async () => {
    const mySeq = ++seq.current;
    const sentAt = Date.now();
    try {
      const next = await api<RoomView>(`/api/rooms/${roomId}/state`);
      if (mySeq !== seq.current) return; // 더 최근 요청의 응답이 이미 반영됨
      const receivedAt = Date.now();
      setClockOffset(next.serverNow - (sentAt + receivedAt) / 2);
      const prev = prevView.current;
      if (prev) {
        const newlyConfirmed = next.cards.find(
          (c) => c.stage === "confirmed" && prev.cards.find((p) => p.id === c.id)?.stage !== "confirmed",
        );
        if (newlyConfirmed) {
          setJustConfirmed(newlyConfirmed.id);
          toast("여행 계획이 하나 확정됐어요!");
          window.setTimeout(() => setJustConfirmed(null), 2000);
        }
      }
      prevView.current = next;
      setView(next);
      setError(null);
    } catch (err) {
      if (mySeq !== seq.current) return;
      const e = err instanceof ApiError ? err : new ApiError(0, "모임 정보를 불러오지 못했어요.");
      // 이미 화면이 있으면 일시적인 오류는 조용히 다음 조회에서 회복한다
      if (!prevView.current || e.status === 401 || e.status === 404) {
        setError({ status: e.status, message: e.message, code: e.code });
      }
    }
  }, [roomId, toast]);

  const fast =
    view?.cards.some((c) =>
      ["battle_running", "battle_lobby", "tallying", "marble_ready", "marble_running"].includes(c.phase ?? ""),
    ) ?? false;

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(first);
  }, [refresh]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, fast ? FAST_POLL_MS : SLOW_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, fast]);

  const act = useCallback(
    async (action: RoomAction) => {
      try {
        await api(`/api/rooms/${roomId}/actions`, { body: action });
        await refresh();
        return true;
      } catch (err) {
        toast(err instanceof Error ? err.message : "요청을 처리하지 못했어요.", "error");
        await refresh();
        return false;
      }
    },
    [roomId, refresh, toast],
  );

  return (
    <>
      {view ? (
        <RoomContext.Provider value={{ view, clockOffset, act, refresh, toast, justConfirmed }}>{children}</RoomContext.Provider>
      ) : (
        <Fallback loading={!error} error={error} retry={refresh} />
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`flex max-w-md animate-rise-in items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              t.tone === "error" ? "bg-danger-ink text-white" : "bg-ink text-white"
            }`}
          >
            {t.tone === "error" ? <CircleAlert className="size-4 shrink-0" aria-hidden /> : <CircleCheck className="size-4 shrink-0" aria-hidden />}
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
