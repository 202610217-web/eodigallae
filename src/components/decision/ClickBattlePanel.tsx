"use client";

import { CircleCheck, Crown, Hand, Hourglass, Keyboard, Play, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { TasteTags } from "@/components/ui/TasteChip";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatCost } from "@/lib/client/format";
import { BATTLE_TAP_MS } from "@/lib/domain/constants";
import { battleWindow } from "@/lib/domain/decide";
import type { DecisionCardView } from "@/lib/domain/types";
import { ResultReveal } from "./ResultReveal";

const FLUSH_MS = 300;

export function ClickBattlePanel({ card }: { card: DecisionCardView }) {
  if (card.phase === "battle_lobby") return <Lobby card={card} />;
  if (card.phase === "battle_running") return <Running card={card} />;
  if (card.phase === "battle_picking") return <Picking card={card} />;
  if (card.result) return <ResultReveal card={card} result={card.result} />;
  return null;
}

function Lobby({ card }: { card: DecisionCardView }) {
  const { view, act } = useRoom();
  const [busy, setBusy] = useState(false);
  const joined = card.battle.some((b) => b.memberId === view.me.id);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] bg-white p-5">
        <p className="flex items-center gap-2 text-lg font-bold">
          <Trophy className="size-5 text-coral-strong" aria-hidden /> 게임 규칙
        </p>
        <ol className="mt-3 space-y-2 text-sm">
          <li>1. 참가할 사람은 ‘준비 완료’를 눌러요.</li>
          <li>2. 방장이 시작하면 3초 카운트다운 후 {BATTLE_TAP_MS / 1000}초 동안 연타해요.</li>
          <li className="flex flex-wrap items-center gap-1">
            3. PC는 <kbd className="rounded border border-line bg-cream px-1.5 font-mono text-xs">Space</kbd> 키, 모바일은 큰 버튼을 눌러요.
          </li>
          <li>4. 가장 많이 누른 사람이 필수 조건을 통과한 후보 중 하나를 골라요.</li>
        </ol>
        <p className="mt-3 text-xs text-ink-soft">키를 누르고 있거나 시간이 끝난 뒤 누른 입력은 세지 않아요. 횟수는 서버가 시간을 기준으로 다시 검증해요.</p>
      </div>

      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <p className="mb-3 text-sm font-bold">준비 완료 {card.battle.length}/{view.members.length}명</p>
        <ul className="flex flex-wrap gap-3">
          {view.members.map((m) => {
            const ready = card.battle.some((b) => b.memberId === m.id);
            return (
              <li key={m.id} className={cn("flex w-16 flex-col items-center gap-1 text-center", !ready && "opacity-40")}>
                <span className="relative">
                  <Avatar character={m.character} color={m.color} />
                  {ready && <CircleCheck className="absolute -right-1 -bottom-1 size-5 animate-pop rounded-full bg-white text-success-ink" aria-label="준비 완료" />}
                </span>
                <span className="w-full truncate text-xs font-semibold">{m.nickname}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {!joined ? (
        <Button size="lg" block loading={busy} icon={<Hand className="size-5" aria-hidden />} onClick={() => run(() => act({ type: "battleReady", cardId: card.id }))}>
          준비 완료
        </Button>
      ) : (
        <Notice tone="success" icon={<CircleCheck className="size-5 animate-pop" aria-hidden />} title="준비 완료!">
          방장이 시작하면 바로 카운트다운이 시작돼요. 화면을 켜 둔 채 기다려주세요.
        </Notice>
      )}
      {view.me.isHost && (
        <Button
          size="lg"
          variant="secondary"
          block
          disabled={card.battle.length === 0}
          loading={busy && joined}
          icon={<Play className="size-4" aria-hidden />}
          onClick={() => run(() => act({ type: "battleStart", cardId: card.id }))}
        >
          {card.battle.length === 0 ? "준비한 참가자를 기다리는 중" : `${card.battle.length}명으로 게임 시작`}
        </Button>
      )}
    </div>
  );
}

function Running({ card }: { card: DecisionCardView }) {
  const { view, clockOffset } = useRoom();
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const [localCount, setLocalCount] = useState(0);
  const pending = useRef(0);
  const spaceHeld = useRef(false);
  const window_ = battleWindow(card.phaseStartedAt ?? 0);
  const participant = card.battle.some((b) => b.memberId === view.me.id);
  const serverCount = card.battle.find((b) => b.memberId === view.me.id)?.taps ?? 0;
  const phase = now < window_.start ? "countdown" : now < window_.end ? "tapping" : "finished";

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() + clockOffset), 100);
    return () => window.clearInterval(t);
  }, [clockOffset]);

  const flush = useCallback(() => {
    const count = pending.current;
    if (count <= 0) return;
    pending.current = 0;
    // 실패해도 다시 보내지 않는다 (서버 기준 시간이 지나면 어차피 인정되지 않음)
    void api(`/api/rooms/${view.id}/actions`, { body: { type: "battleTaps", cardId: card.id, count } }).catch(() => undefined);
  }, [view.id, card.id]);

  useEffect(() => {
    if (!participant) return;
    const t = window.setInterval(flush, FLUSH_MS);
    return () => {
      window.clearInterval(t);
      flush();
    };
  }, [participant, flush]);

  // 연타 시간이 끝나면 남은 입력을 즉시 보낸다
  useEffect(() => {
    if (phase === "finished") flush();
  }, [phase, flush]);

  const tap = useCallback(() => {
    const t = Date.now() + clockOffset;
    if (!participant || t < window_.start || t >= window_.end) return;
    pending.current += 1;
    setLocalCount((c) => c + 1);
  }, [participant, clockOffset, window_.start, window_.end]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      // 키를 계속 누르고 있는 동작(자동 반복)은 무시하고, 뗐다가 다시 눌러야 한 번으로 센다
      if (e.repeat || spaceHeld.current) return;
      spaceHeld.current = true;
      tap();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [tap]);

  if (phase === "countdown") {
    const n = Math.max(1, Math.ceil((window_.start - now) / 1000));
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] bg-ink py-16 text-white" role="timer" aria-live="assertive">
        <p className="text-sm font-semibold text-white/70">{participant ? "곧 시작해요! 준비하세요" : "곧 게임이 시작돼요"}</p>
        <span key={n} className="mt-2 animate-count text-8xl font-black tabular-nums">
          {n}
        </span>
      </div>
    );
  }

  const remaining = Math.max(0, window_.end - now);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-white px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <Hourglass className="size-4 text-coral-strong" aria-hidden />
          {phase === "tapping" ? "남은 시간" : "종료"}
        </span>
        <span className="text-2xl font-black tabular-nums" role="timer">
          {(remaining / 1000).toFixed(1)}초
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-cream-deep" aria-hidden>
        <div className="h-full bg-coral" style={{ width: `${(remaining / BATTLE_TAP_MS) * 100}%` }} />
      </div>

      {participant ? (
        phase === "tapping" ? (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              tap();
            }}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            className="flex h-56 w-full touch-manipulation flex-col items-center justify-center rounded-3xl bg-coral-strong text-white select-none active:scale-[0.98] active:bg-[#d84a33] md:h-64"
            aria-label="연타 버튼"
          >
            <span className="text-6xl font-black tabular-nums">{localCount}</span>
            <span className="mt-2 flex items-center gap-1.5 text-base font-bold">
              <Hand className="size-5" aria-hidden /> 빠르게 눌러요!
            </span>
            <span className="mt-1 hidden items-center gap-1 text-sm text-white/80 md:flex">
              <Keyboard className="size-4" aria-hidden /> 스페이스 키도 돼요
            </span>
          </button>
        ) : (
          <div className="rounded-[var(--radius-card)] bg-white p-6 text-center" role="status">
            <p className="text-lg font-bold">시간 종료!</p>
            <p className="mt-1 text-sm text-ink-soft">
              내가 누른 횟수 {localCount}회 · 서버 인정 {serverCount}회
            </p>
            <p className="mt-2 text-sm text-ink-soft">순위를 집계하고 있어요…</p>
          </div>
        )
      ) : (
        <div className="rounded-[var(--radius-card)] bg-white p-6 text-center">
          <p className="font-bold">이번 게임에는 참여하지 않았어요.</p>
          <p className="mt-1 text-sm text-ink-soft">게임이 끝나면 순위와 결정권자를 알려드릴게요.</p>
        </div>
      )}
    </div>
  );
}

function Picking({ card }: { card: DecisionCardView }) {
  const { view, act } = useRoom();
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const winner = view.members.find((m) => m.id === card.battleWinnerId);
  const isWinner = card.battleWinnerId === view.me.id;
  const ranking = [...card.battle].sort((a, b) =>
    a.memberId === card.battleWinnerId ? -1 : b.memberId === card.battleWinnerId ? 1 : (b.taps ?? 0) - (a.taps ?? 0),
  );
  const eligible = new Set(card.evaluations.filter((e) => e.state === "pass").map((e) => e.candidateId));
  const options = card.pool.filter((id) => eligible.has(id)).map((id) => card.candidates.find((c) => c.id === id)!).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <p className="mb-3 text-sm font-bold">연타 순위</p>
        <ol className="space-y-2">
          {ranking.map((b, i) => {
            const m = view.members.find((x) => x.id === b.memberId);
            if (!m) return null;
            const top = b.memberId === card.battleWinnerId;
            return (
              <li
                key={b.memberId}
                className={cn("stagger flex items-center gap-3 rounded-xl px-3 py-2", top ? "bg-[#FFF5D6] ring-2 ring-[#F0C24B]" : "bg-cream")}
                style={{ "--i": i } as CSSProperties}
              >
                <span className="w-5 text-center font-black text-ink-soft">{i + 1}</span>
                <Avatar character={m.character} color={m.color} crown={top} />
                <span className="min-w-0 flex-1 truncate font-bold">{m.nickname}</span>
                <span className="font-black tabular-nums">{b.taps ?? 0}회</span>
              </li>
            );
          })}
        </ol>
      </div>

      {isWinner ? (
        <div className="space-y-3">
          <Notice tone="success" icon={<Crown className="size-5 animate-crown" aria-hidden />} title="결정권 획득! 장소를 골라주세요">
            필수 조건을 통과한 후보만 고를 수 있어요.
          </Notice>
          <fieldset className="space-y-2">
            <legend className="sr-only">후보 선택</legend>
            {options.map((c) => (
              <label
                key={c.id}
                className={cn("flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border-2 bg-white p-4", choice === c.id ? "border-coral-strong" : "border-transparent")}
              >
                <input type="radio" name={`pick-${card.id}`} className="mt-1 size-5 accent-[#e9553d]" checked={choice === c.id} onChange={() => setChoice(c.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold break-words">{c.name}</span>
                  <span className="block text-sm text-ink-soft">{formatCost(c.cost)}</span>
                  <TasteTags tags={c.tags} className="mt-1.5" />
                </span>
              </label>
            ))}
          </fieldset>
          <Button
            size="lg"
            block
            disabled={!choice}
            loading={busy}
            onClick={async () => {
              if (!choice) return;
              setBusy(true);
              await act({ type: "battlePick", cardId: card.id, candidateId: choice });
              setBusy(false);
            }}
          >
            이 후보로 결정
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-white p-6 text-center" role="status">
          {winner && <Avatar character={winner.character} color={winner.color} size="lg" crown />}
          <p className="mt-3 text-lg font-bold">결정권자가 장소를 선택하고 있어요.</p>
          <p className="mt-1 text-sm text-ink-soft">{winner?.nickname}님이 고르면 결과가 바로 공개돼요.</p>
        </div>
      )}
    </div>
  );
}
