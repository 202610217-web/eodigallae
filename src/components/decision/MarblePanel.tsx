"use client";

import { CircleDot, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { api } from "@/lib/client/api";
import { marblePositions, type MarbleRace } from "@/lib/domain/marble";
import type { DecisionCardView } from "@/lib/domain/types";

const VIEW_HEIGHT = 460; // 화면에 보이는 경기장 높이(px)
const COLORS = ["#FF755E", "#4C8DF6", "#2FB38A", "#F0A428", "#9B6CF6", "#E5578F", "#22A6C7", "#8BC34A", "#FF9F43", "#5C6BC0", "#26A69A", "#EC407A"];

/** 구슬 레이스: 출발 전(방장이 시작) → 서버가 저장한 기록을 모두 같은 시각에 재생 */
export function MarblePanel({ card }: { card: DecisionCardView }) {
  if (card.phase === "marble_ready") return <MarbleLobby card={card} />;
  if (card.phase === "marble_running" && card.marble) return <MarblePlayer key={card.round} card={card} />;
  return null;
}

function MarbleLobby({ card }: { card: DecisionCardView }) {
  const { view, act } = useRoom();
  const [busy, setBusy] = useState(false);
  const names = card.pool.map((id) => card.candidates.find((c) => c.id === id)?.name ?? "후보");
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] bg-white p-5">
        <p className="text-sm font-bold">출발할 구슬 {names.length}개</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {names.map((name, i) => (
            <li key={`${name}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-sm font-medium">
              <span className="size-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden />
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-soft">출발 자리는 무작위로 정해져요. 가장 먼저 결승선에 닿은 구슬이 당첨이에요.</p>
      </div>
      {view.me.isHost ? (
        <Button
          size="lg"
          block
          loading={busy}
          icon={<Play className="size-4" aria-hidden />}
          onClick={async () => {
            setBusy(true);
            await act({ type: "startMarble", cardId: card.id });
            setBusy(false);
          }}
        >
          구슬 출발!
        </Button>
      ) : (
        <p className="rounded-xl bg-white px-4 py-3 text-center text-sm text-ink-soft">방장이 출발시키면 모두 같은 화면으로 레이스를 봐요.</p>
      )}
    </div>
  );
}

function MarblePlayer({ card }: { card: DecisionCardView }) {
  const { clockOffset, view } = useRoom();
  const [race, setRace] = useState<{ race: MarbleRace; startsAt: number; endsAt: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [ranking, setRanking] = useState<number[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef(clockOffset);
  useEffect(() => {
    offsetRef.current = clockOffset;
  }, [clockOffset]);

  // 기록은 한 번만 받는다 (재생 도중 들어와도 같은 기록 + 서버 시각으로 같은 장면부터)
  useEffect(() => {
    let alive = true;
    api<{ race: MarbleRace; startsAt: number; endsAt: number }>(`/api/rooms/${view.id}/marble/${card.id}`)
      .then((data) => alive && setRace(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [view.id, card.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!race || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = race.race;
    let raf = 0;
    let cameraY = 0;
    let lastRank = 0;

    const frame = () => {
      const cssWidth = canvas.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(cssWidth * dpr)) {
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(VIEW_HEIGHT * dpr);
      }
      const scale = cssWidth / r.width;
      const viewWorld = VIEW_HEIGHT / scale;
      const elapsed = Date.now() + offsetRef.current - race.startsAt;
      const pos = marblePositions(r, elapsed);

      // 카메라: 아직 달리는 구슬 중 가장 앞선 구슬을 따라간다
      const running = pos.filter((p) => p.y < r.finishY);
      const leadY = running.length ? Math.max(...running.map((p) => p.y)) : r.height;
      const target = Math.max(0, Math.min(r.height - viewWorld, leadY - viewWorld * 0.55));
      cameraY = elapsed <= 0 ? 0 : cameraY + (target - cameraY) * 0.12;

      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, -cameraY * dpr * scale);
      ctx.fillStyle = "#F5F1EA";
      ctx.fillRect(0, cameraY, r.width, viewWorld);

      // 결승선 (체크무늬)
      const cell = 10;
      for (let x = 0; x < r.width; x += cell) {
        for (let k = 0; k < 2; k++) {
          ctx.fillStyle = (x / cell + k) % 2 === 0 ? "#252D3B" : "#FFFFFF";
          ctx.fillRect(x, r.finishY - cell * 2 + k * cell, cell, cell);
        }
      }

      ctx.strokeStyle = "#8A92A1";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (const [x1, y1, x2, y2] of r.walls) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.fillStyle = "#545E70";
      for (const [x, y, pr] of r.pegs) {
        if (y < cameraY - 20 || y > cameraY + viewWorld + 20) continue;
        ctx.beginPath();
        ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = `bold ${11 / Math.max(scale, 0.5)}px Pretendard, sans-serif`;
      ctx.textAlign = "center";
      pos.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r.radius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();
        ctx.fillStyle = "#252D3B";
        ctx.fillText(r.names[i].slice(0, 6), p.x, p.y - r.radius - 4);
      });

      const now = performance.now();
      if (now - lastRank > 250) {
        lastRank = now;
        // 실시간 순위: 이미 도착한 구슬은 도착 순서대로, 나머지는 더 아래에 있는 순서대로
        const arrived = pos.filter((p) => p.y >= r.finishY).length;
        const done = r.order.slice(0, arrived);
        const rest = pos
          .map((p, i) => ({ i, y: p.y }))
          .filter(({ i }) => !done.includes(i))
          .sort((a, b) => b.y - a.y)
          .map(({ i }) => i);
        setRanking([...done, ...rest]);
        setCountdown(elapsed < 0 ? Math.ceil(-elapsed / 1000) : null);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [race]);

  if (failed) {
    return <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-ink-soft">레이스 기록을 불러오지 못했어요. 끝나면 결과가 바로 보여요.</p>;
  }
  if (!race) return <LoadingState label="구슬 레이스를 불러오는 중이에요" />;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-cream">
        <canvas ref={canvasRef} className="block w-full" style={{ height: VIEW_HEIGHT }} aria-label="구슬 레이스 화면" role="img" />
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/20">
            <span key={countdown} className="animate-count text-7xl font-black text-white drop-shadow">
              {countdown}
            </span>
          </div>
        )}
      </div>
      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <CircleDot className="size-4 text-coral-strong" aria-hidden /> 실시간 순위
        </p>
        <ol className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {ranking.slice(0, 6).map((i, rank) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="w-4 text-center font-bold text-ink-soft">{rank + 1}</span>
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden />
              <span className="truncate">{race.race.names[i]}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-ink-soft">모든 구슬이 들어오면 결과가 공개돼요.</p>
      </div>
    </div>
  );
}
