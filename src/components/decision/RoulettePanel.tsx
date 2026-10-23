"use client";

import { Dices, Triangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Button } from "@/components/ui/Button";
import { rouletteRotation } from "@/lib/domain/decide";
import type { DecisionCardView } from "@/lib/domain/types";
import { ResultReveal } from "./ResultReveal";

const SLICE_COLORS = ["#FF755E", "#FFD3C9", "#4C8DF6", "#CFE0FF", "#2FB38A", "#C9EEDF", "#F0A428", "#FFE6B5"];
const SPIN_MS = 4600;
const FRESH_MS = 8000;

function Wheel({ names, rotation, animate, onDone }: { names: string[]; rotation: number; animate: boolean; onDone?: () => void }) {
  const n = Math.max(names.length, 1);
  const seg = 360 / n;
  const r = 100;
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [r + r * Math.cos(rad), r + r * Math.sin(rad)];
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <Triangle className="absolute -top-1 left-1/2 z-10 size-7 -translate-x-1/2 rotate-180 fill-ink text-ink" aria-hidden />
      <svg
        viewBox="0 0 200 200"
        className={animate ? "roulette-wheel size-full" : "size-full"}
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={onDone}
        role="img"
        aria-label={`룰렛: ${names.join(", ")}`}
      >
        {names.map((name, i) => {
          const [x1, y1] = point(i * seg);
          const [x2, y2] = point((i + 1) * seg);
          const large = seg > 180 ? 1 : 0;
          const mid = (i + 0.5) * seg;
          const color = SLICE_COLORS[i % SLICE_COLORS.length];
          const dark = i % 2 === 0;
          const label = name.length > 7 ? `${name.slice(0, 6)}…` : name;
          return (
            <g key={`${name}-${i}`}>
              {n === 1 ? (
                <circle cx={r} cy={r} r={r} fill={color} />
              ) : (
                <path d={`M${r},${r} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={color} stroke="#fff" strokeWidth="1.5" />
              )}
              <text
                x={r}
                y={r - 62}
                transform={`rotate(${mid} ${r} ${r})`}
                textAnchor="middle"
                fontSize={n > 8 ? 8 : 10}
                fontWeight={700}
                fill={dark ? "#fff" : "#252D3B"}
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle cx={r} cy={r} r={14} fill="#fff" stroke="#E6E0D5" />
      </svg>
    </div>
  );
}

export function RoulettePanel({ card }: { card: DecisionCardView }) {
  const { view, act, clockOffset } = useRoom();
  const [busy, setBusy] = useState(false);
  const result = card.result && card.result.detail.kind === "roulette" ? card.result : null;

  // 결과가 나온 뒤: 서버가 정한 당첨 칸으로 회전만 보여준다
  const target = result && result.detail.kind === "roulette"
    ? rouletteRotation(result.detail.winnerIndex, result.detail.pool.length, 6, ((result.createdAt % 1000) / 1000 - 0.5) * 0.6)
    : 0;
  const [spin, setSpin] = useState<{ rotation: number; animate: boolean; done: boolean }>(() => {
    if (!result) return { rotation: 0, animate: false, done: false };
    const fresh = Date.now() + clockOffset - result.createdAt < FRESH_MS;
    return fresh ? { rotation: 0, animate: true, done: false } : { rotation: target, animate: false, done: true };
  });
  const started = useRef(false);

  useEffect(() => {
    if (!result || spin.done || started.current) return;
    started.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 첫 프레임을 그린 다음 회전을 시작해야 transition이 적용된다 (동작 줄이기 설정이면 바로 결과)
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSpin(reduce ? { rotation: target, animate: false, done: true } : { rotation: target, animate: true, done: false })),
    );
    const fallback = window.setTimeout(() => setSpin((s) => ({ ...s, done: true })), SPIN_MS + 400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [result, spin.done, target]);

  if (result && result.detail.kind === "roulette") {
    const names = result.detail.pool.map((p) => p.name);
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-white p-5">
          <Wheel names={names} rotation={spin.rotation} animate={spin.animate} onDone={() => setSpin((s) => ({ ...s, done: true }))} />
          <p className="mt-3 text-center text-sm font-semibold text-ink-soft" aria-live="polite">
            {spin.done ? `당첨: ${result.candidate.name}` : "룰렛이 돌아가는 중…"}
          </p>
        </div>
        {spin.done && <ResultReveal card={card} result={result} />}
      </div>
    );
  }

  // 돌리기 전: 포함된 후보를 먼저 확인한다
  const eligible = new Set(card.evaluations.filter((e) => e.state === "pass").map((e) => e.candidateId));
  const ids = (card.tieCandidateIds.length > 0 ? card.tieCandidateIds : card.pool).filter((id) => eligible.has(id));
  const names = ids.map((id) => card.candidates.find((c) => c.id === id)?.name ?? "후보");

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] bg-white p-5">
        <Wheel names={names} rotation={0} animate={false} />
        <div className="mt-4">
          <p className="text-sm font-bold">
            룰렛에 포함된 후보 {names.length}개 · 모두 같은 확률 ({names.length ? Math.round(1000 / names.length) / 10 : 0}%)
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {names.map((name, i) => (
              <li key={`${name}-${i}`} className="rounded-full bg-cream px-3 py-1 text-sm font-medium">
                {name}
              </li>
            ))}
          </ul>
          {card.tieCandidateIds.length > 0 && <p className="mt-2 text-xs text-ink-soft">다수결 동점 후보만 들어갔어요.</p>}
        </div>
      </div>
      {view.me.isHost ? (
        <Button
          size="lg"
          block
          loading={busy}
          icon={<Dices className="size-5" aria-hidden />}
          onClick={async () => {
            setBusy(true);
            await act({ type: "spinRoulette", cardId: card.id });
            setBusy(false);
          }}
        >
          룰렛 돌리기
        </Button>
      ) : (
        <p className="rounded-xl bg-white px-4 py-3 text-center text-sm text-ink-soft">방장이 룰렛을 돌리면 여기서 함께 볼 수 있어요.</p>
      )}
    </div>
  );
}
