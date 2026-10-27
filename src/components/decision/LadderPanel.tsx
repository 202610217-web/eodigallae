"use client";

import { Crown, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { Pill } from "@/components/ui/StatusBadge";
import { TasteTags } from "@/components/ui/TasteChip";
import { cn } from "@/lib/client/cn";
import { formatCost } from "@/lib/client/format";
import { COLOR_KEYS, colorHex, type LadderTarget } from "@/lib/domain/constants";
import { traceLadder } from "@/lib/domain/ladder";
import type { DecisionCardView, LadderLane, LadderRun } from "@/lib/domain/types";
import { LADDER_TARGET_INFO } from "./modeInfo";
import { ResultReveal } from "./ResultReveal";

const ROW_H = 52;
const TRACE_MS = 3200;
// 사다리를 탄 지 이보다 오래 지나서 처음 본 사람에게는 내려가는 모습 없이 결과만 보여준다
const FRESH_MS = 10_000;

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

/** 사다리를 내려가는 진행률(0~1). 방금 탄 사다리면 처음부터 그리고, 오래된 사다리면 바로 끝난 상태 */
function useTraceProgress(ranAt: number | null, clockOffset: number): number {
  const offset = useRef(clockOffset);
  useEffect(() => {
    offset.current = clockOffset;
  });
  const [progress, setProgress] = useState(() => (ranAt !== null && Date.now() + clockOffset - ranAt > FRESH_MS ? 1 : 0));

  useEffect(() => {
    if (ranAt === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let startedAt: number | null = null;
    let frame = 0;
    const tick = (t: number) => {
      if (startedAt === null) {
        if (reduce || Date.now() + offset.current - ranAt > FRESH_MS) {
          setProgress(1);
          return;
        }
        startedAt = t;
      }
      const p = Math.min(1, (t - startedAt) / TRACE_MS);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ranAt]);

  return ranAt === null ? 0 : progress;
}

function laneColor(lane: LadderLane, index: number): string {
  return colorHex(lane.color ?? COLOR_KEYS[index % COLOR_KEYS.length]);
}

export function LadderPanel({ card }: { card: DecisionCardView }) {
  const { view, act, clockOffset } = useRoom();
  const [busy, setBusy] = useState(false);
  const target: LadderTarget = card.ladder?.target ?? (card.result?.detail.kind === "ladder" ? card.result.detail.target : "candidate");
  const run = card.ladder?.run ?? (card.result?.detail.kind === "ladder" ? card.result.detail.run : null);
  const progress = useTraceProgress(run?.ranAt ?? null, clockOffset);
  const done = run !== null && progress >= 1;
  const info = LADDER_TARGET_INFO[target];

  // 사다리를 타기 전에는 지금 들어갈 참가자·후보로 세로줄을 미리 보여준다 (서버와 같은 기준)
  const lanes: LadderLane[] =
    run?.lanes ??
    (target === "member"
      ? view.members.filter((m) => !m.isBot).map((m) => ({ id: m.id, name: m.nickname, character: m.character, color: m.color }))
      : card.pool
          .map((id) => card.candidates.find((c) => c.id === id))
          .filter((c) => c !== undefined)
          .map((c) => ({ id: c.id, name: c.name, character: null, color: null })));
  const winner = run ? run.lanes[run.winnerLane] : null;

  const status = !run
    ? target === "member"
      ? `참가자 ${lanes.length}명이 사다리를 타요. ‘${info.prize}’ 칸에 닿은 사람이 후보를 골라요.`
      : `후보 ${lanes.length}개가 사다리를 타요. ‘${info.prize}’ 칸에 닿은 후보로 정해져요.`
    : !done
      ? "사다리를 내려가는 중…"
      : target === "member"
        ? `${winner?.name}님이 결정권을 얻었어요!`
        : `당첨: ${winner?.name}`;

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] bg-white p-4 md:p-5">
        <p className="flex items-center gap-2 font-bold">
          <Shuffle className="size-5 text-coral-strong" aria-hidden /> {info.title}
        </p>
        <LadderBoard className="mt-4" lanes={lanes} run={run} progress={progress} prizeLabel={info.prize} />
        <p className="mt-3 text-center text-sm font-semibold text-ink-soft" aria-live="polite">
          {status}
        </p>
      </div>

      {!run &&
        (view.me.isHost ? (
          <Button
            size="lg"
            block
            loading={busy}
            icon={<Shuffle className="size-5" aria-hidden />}
            onClick={async () => {
              setBusy(true);
              await act({ type: "runLadder", cardId: card.id });
              setBusy(false);
            }}
          >
            사다리 타기
          </Button>
        ) : (
          <p className="rounded-xl bg-white px-4 py-3 text-center text-sm text-ink-soft">방장이 사다리를 타면 여기서 함께 볼 수 있어요.</p>
        ))}

      {done && card.phase === "ladder_picking" && run && <DeciderPick card={card} run={run} />}
      {done && card.phase === "result" && card.result && <ResultReveal card={card} result={card.result} />}
    </div>
  );
}

/** 가로로 누운 사다리: 왼쪽 이름에서 출발해 오른쪽 칸(당첨/꽝)에 도착한다. 휴대폰에서도 긴 이름과 많은 줄이 들어간다 */
function LadderBoard({
  lanes,
  run,
  progress,
  prizeLabel,
  className,
}: {
  lanes: LadderLane[];
  run: LadderRun | null;
  progress: number;
  prizeLabel: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const done = run !== null && progress >= 1;
  const height = lanes.length * ROW_H;
  const y = (lane: number) => lane * ROW_H + ROW_H / 2;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const pad = 10;
  const stepX = (step: number) => (run ? pad + ((step + 0.5) * (width - pad * 2)) / run.steps : 0);
  const paths = run
    ? lanes.map((_, start) => {
        const points: [number, number][] = [[0, y(start)]];
        let lane = start;
        traceLadder(run, start).forEach((next, step) => {
          points.push([stepX(step), y(lane)]);
          if (next !== lane) points.push([stepX(step), y(next)]);
          lane = next;
        });
        points.push([width, y(lane)]);
        const length = points.slice(1).reduce((sum, [px, py], i) => sum + Math.hypot(px - points[i][0], py - points[i][1]), 0);
        return { d: points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" "), length };
      })
    : [];
  const eased = easeInOut(progress);
  // 당첨 줄을 맨 위에 그린다
  const order = run ? [...lanes.keys()].sort((a, b) => (a === run.winnerLane ? 1 : b === run.winnerLane ? -1 : a - b)) : [];

  return (
    <div className={cn("grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_3.5rem] md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_4rem]", className)}>
      <ol aria-label="출발" className="min-w-0">
        {lanes.map((lane, i) => {
          const won = done && run?.winnerLane === i;
          return (
            <li key={lane.id} className={cn("flex items-center gap-2 rounded-l-xl pl-1.5 transition-colors", won && "bg-coral-soft")} style={{ height: ROW_H }}>
              {lane.character && lane.color ? (
                <Avatar character={lane.character} color={lane.color} size="sm" crown={won} />
              ) : (
                <span className="size-3 shrink-0 rounded-full" style={{ background: laneColor(lane, i) }} aria-hidden />
              )}
              <span className={cn("min-w-0 truncate text-sm", won ? "font-bold" : "font-medium")}>{lane.name}</span>
            </li>
          );
        })}
      </ol>

      <div ref={boxRef} className="relative min-w-0" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} className="absolute inset-0" role="img" aria-label={run ? "사다리 결과" : "아직 타지 않은 사다리"}>
            {lanes.map((lane, i) => (
              <line key={lane.id} x1={0} x2={width} y1={y(i)} y2={y(i)} stroke="var(--color-line)" strokeWidth={3} strokeLinecap="round" />
            ))}
            {run && (
              <g className="animate-fade">
                {run.rungs.map(([step, gap]) => (
                  <line key={`${step}:${gap}`} x1={stepX(step)} x2={stepX(step)} y1={y(gap)} y2={y(gap + 1)} stroke="var(--color-line)" strokeWidth={3} strokeLinecap="round" />
                ))}
              </g>
            )}
            {order.map((i) => {
              const { d, length } = paths[i];
              const won = run?.winnerLane === i;
              return (
                <path
                  key={lanes[i].id}
                  d={d}
                  fill="none"
                  stroke={laneColor(lanes[i], i)}
                  strokeWidth={won && done ? 5 : 3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${length} ${length}`}
                  strokeDashoffset={length * (1 - eased)}
                  opacity={done && !won ? 0.25 : 1}
                  className="transition-opacity duration-500"
                />
              );
            })}
          </svg>
        )}
        {!run && lanes.length > 1 && (
          <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-full bg-cream px-3 py-1 text-center text-xs font-semibold text-ink-soft">
            사다리를 타면 가로줄이 나타나요
          </span>
        )}
      </div>

      <ol aria-label="도착" className="min-w-0">
        {lanes.map((lane, i) => (
          <li key={lane.id} className={cn("flex items-center justify-center rounded-r-xl", done && run?.prizeIndex === i && "bg-coral-soft")} style={{ height: ROW_H }}>
            {!done ? (
              <span className="text-sm font-bold text-ink-faint" aria-label="아직 몰라요">
                ?
              </span>
            ) : run?.prizeIndex === i ? (
              <Pill tone="coral" className="animate-pop px-2">
                {prizeLabel}
              </Pill>
            ) : (
              <span className="text-sm font-semibold text-ink-faint">꽝</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 결정권자 정하기: 당첨된 사람이 결정 대상 후보 중 하나를 고른다 */
function DeciderPick({ card, run }: { card: DecisionCardView; run: LadderRun }) {
  const { view, act } = useRoom();
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const decider = run.lanes[run.winnerLane];
  const deciderMember = view.members.find((m) => m.id === decider.id);
  const options = card.pool.map((id) => card.candidates.find((c) => c.id === id)).filter((c) => c !== undefined);

  if (decider.id !== view.me.id) {
    return (
      <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-white p-6 text-center" role="status">
        {deciderMember && <Avatar character={deciderMember.character} color={deciderMember.color} size="lg" crown />}
        <p className="mt-3 text-lg font-bold">결정권자가 후보를 고르고 있어요.</p>
        <p className="mt-1 text-sm text-ink-soft">{decider.name}님이 고르면 결과가 바로 공개돼요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Notice tone="success" icon={<Crown className="size-5 animate-crown" aria-hidden />} title="결정권 획득! 후보를 골라주세요">
        결정 대상 후보 중에서 골라요. 의견 투표 집계를 떠올리며 골라주세요.
      </Notice>
      <fieldset className="space-y-2">
        <legend className="sr-only">후보 선택</legend>
        {options.map((c) => (
          <label
            key={c.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border-2 bg-white p-4",
              choice === c.id ? "border-coral-strong" : "border-transparent",
            )}
          >
            <input type="radio" name={`ladder-pick-${card.id}`} className="mt-1 size-5 accent-coral-strong" checked={choice === c.id} onChange={() => setChoice(c.id)} />
            <span className="min-w-0 flex-1">
              <span className="block font-bold break-words">{c.name}</span>
              <span className="block text-sm text-ink-soft">{formatCost(c.cost, c.notes.cost)}</span>
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
          await act({ type: "ladderPick", cardId: card.id, candidateId: choice });
          setBusy(false);
        }}
      >
        이 후보로 결정
      </Button>
    </div>
  );
}
