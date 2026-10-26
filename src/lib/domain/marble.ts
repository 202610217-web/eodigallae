// 구슬 레이스: 후보 이름을 단 구슬을 장애물 맵 위에서 떨어뜨려 가장 먼저 결승선에 닿은 구슬이 당첨.
// 서버가 한 번만 시뮬레이션해서 움직임 기록을 저장하고, 화면은 그 기록을 재생만 한다.
// (모든 기기가 같은 장면을 보고, 결과는 재생 전에 이미 정해져 있다)

export const MARBLE_WIDTH = 360;
export const MARBLE_HEIGHT = 2100;
export const MARBLE_FINISH_Y = 2020;
export const MARBLE_RADIUS = 9;
/** 기록 프레임 수 (초당). 화면은 프레임 사이를 보간해 부드럽게 그린다 */
export const MARBLE_FPS = 30;
/** 출발 전 카운트다운 */
export const MARBLE_COUNTDOWN_MS = 3_000;
/** 결승 후 결과 공개까지 여유 */
export const MARBLE_FINISH_HOLD_MS = 1_500;

const STEP = 1 / 240; // 물리 계산 간격 (초)
const STEPS_PER_FRAME = 240 / MARBLE_FPS;
const GRAVITY = 820;
const MAX_SECONDS = 90;
const MAX_SPEED = 950;
const WALL_BOUNCE = 0.42;
const MARBLE_BOUNCE = 0.55;

export type Peg = [x: number, y: number, r: number];
export type Wall = [x1: number, y1: number, x2: number, y2: number];

export interface MarbleRace {
  width: number;
  height: number;
  finishY: number;
  radius: number;
  fps: number;
  pegs: Peg[];
  walls: Wall[];
  /** 구슬 순서대로 후보 id·이름 */
  ids: string[];
  names: string[];
  /** frames[f] = [x0*2, y0*2, x1*2, y1*2, ...] (0.5px 단위 정수) */
  frames: number[][];
  /** 도착 순서 (구슬 번호). 시간 안에 못 들어온 구슬은 더 아래에 있는 순서로 뒤에 붙는다 */
  order: number[];
  /** 마지막 기록 시점까지의 재생 길이 */
  durationMs: number;
}

/** 시드로 재현 가능한 난수 (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 고정 맵: 핀 구간 → 깔때기 → 지그재그 경사로 → 범퍼 구간 → 결승선 */
export function buildMarbleMap(): { pegs: Peg[]; walls: Wall[] } {
  const W = MARBLE_WIDTH;
  const pegs: Peg[] = [];
  const walls: Wall[] = [
    [0, -200, 0, MARBLE_HEIGHT],
    [W, -200, W, MARBLE_HEIGHT],
    [0, MARBLE_HEIGHT, W, MARBLE_HEIGHT],
  ];

  // 1) 핀 구간: 엇갈린 줄
  for (let row = 0; row < 12; row++) {
    const y = 150 + row * 38;
    const offset = row % 2 === 0 ? 30 : 50;
    for (let x = offset; x < W - 10; x += 40) pegs.push([x, y, 5]);
  }

  // 2) 깔때기: 가운데 좁은 구멍으로 모였다가 다시 퍼진다
  walls.push([0, 640, W / 2 - 34, 760], [W, 640, W / 2 + 34, 760]);
  pegs.push([W / 2, 820, 11]);

  // 3) 지그재그 경사로: 좌우로 오가며 굴러 내려간다 (끝에 구슬이 빠질 틈을 둔다)
  for (let i = 0; i < 6; i++) {
    const y = 880 + i * 110;
    if (i % 2 === 0) walls.push([0, y, W - 58, y + 46]);
    else walls.push([W, y, 58, y + 46]);
  }
  // 경사로 사이 작은 방해 핀
  for (let i = 0; i < 5; i++) {
    const y = 950 + i * 110;
    pegs.push([i % 2 === 0 ? W - 90 : 90, y, 6], [W / 2, y + 10, 6]);
  }

  // 4) 범퍼 구간: 크고 작은 원이 섞여 순위가 마지막까지 바뀐다
  for (let row = 0; row < 9; row++) {
    const y = 1590 + row * 44;
    const offset = row % 2 === 0 ? 40 : 70;
    for (let x = offset; x < W - 20; x += 60) pegs.push([x, y, row % 3 === 1 ? 10 : 6]);
  }
  return { pegs, walls };
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  done: boolean;
  still: number;
}

/**
 * 레이스를 끝까지 계산한다. seed와 참가 후보가 같으면 결과도 같다.
 * 출발 자리는 시드로 섞어서, 목록 순서가 유리하거나 불리하지 않게 한다.
 */
export function simulateMarbleRace(entries: { id: string; name: string }[], seed: number): MarbleRace {
  if (entries.length === 0) throw new Error("구슬이 없어요");
  const rand = rng(seed);
  const { pegs, walls } = buildMarbleMap();
  const r = MARBLE_RADIUS;
  const n = entries.length;

  // 출발 자리: 한 줄에 최대 9개, 줄마다 위로 쌓는다. 자리 배정은 무작위
  const slots = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const perRow = Math.min(n, 9);
  const bodies: Body[] = slots.map((slot) => {
    const row = Math.floor(slot / perRow);
    const col = slot % perRow;
    const gap = MARBLE_WIDTH / (perRow + 1);
    return {
      x: gap * (col + 1) + (rand() - 0.5) * 6,
      y: 60 - row * (r * 2 + 6),
      vx: (rand() - 0.5) * 40,
      vy: 0,
      done: false,
      still: 0,
    };
  });

  const order: number[] = [];
  const frames: number[][] = [];
  const record = () => frames.push(bodies.flatMap((b) => [Math.round(b.x * 2), Math.round(b.y * 2)]));
  record();

  const maxSteps = MAX_SECONDS / STEP;
  for (let step = 1; step <= maxSteps && order.length < n; step++) {
    for (const b of bodies) {
      if (b.done) continue;
      b.vy += GRAVITY * STEP;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > MAX_SPEED) {
        b.vx *= MAX_SPEED / speed;
        b.vy *= MAX_SPEED / speed;
      }
      b.x += b.vx * STEP;
      b.y += b.vy * STEP;
    }

    for (let pass = 0; pass < 2; pass++) {
      for (const b of bodies) {
        if (b.done) continue;
        for (const [px, py, pr] of pegs) collideCircle(b, px, py, pr + r);
        for (const w of walls) collideSegment(b, w, r);
      }
      for (let i = 0; i < n; i++) {
        const a = bodies[i];
        if (a.done) continue;
        for (let j = i + 1; j < n; j++) {
          const b = bodies[j];
          if (!b.done) collideMarbles(a, b, r);
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      if (b.done) continue;
      if (b.y >= MARBLE_FINISH_Y) {
        // 결승: 도착 순서대로 결승선 아래 칸에 세워 둔다
        b.done = true;
        const place = order.length;
        order.push(i);
        b.x = Math.min(MARBLE_WIDTH - r, r + 4 + (place % 15) * (r * 2 + 4));
        b.y = MARBLE_FINISH_Y + 30 + Math.floor(place / 15) * (r * 2 + 4);
        b.vx = b.vy = 0;
        continue;
      }
      // 핀 위에 딱 멈춰 버린 구슬은 살짝 흔들어 준다
      if (Math.hypot(b.vx, b.vy) < 12) b.still += STEP;
      else b.still = 0;
      if (b.still > 0.6) {
        b.vx += (rand() < 0.5 ? -1 : 1) * (60 + rand() * 60);
        b.vy -= 40;
        b.still = 0;
      }
    }

    if (step % STEPS_PER_FRAME === 0) record();
  }
  if (frames.length === 0 || order.length === n) record();

  // 시간 안에 못 들어온 구슬은 더 아래(결승에 가까운) 순서로
  const rest = bodies
    .map((b, i) => ({ i, y: b.y }))
    .filter(({ i }) => !order.includes(i))
    .sort((a, b) => b.y - a.y)
    .map(({ i }) => i);

  return {
    width: MARBLE_WIDTH,
    height: MARBLE_HEIGHT,
    finishY: MARBLE_FINISH_Y,
    radius: r,
    fps: MARBLE_FPS,
    pegs,
    walls,
    ids: entries.map((e) => e.id),
    names: entries.map((e) => e.name),
    frames,
    order: [...order, ...rest],
    durationMs: Math.round(((frames.length - 1) / MARBLE_FPS) * 1000),
  };
}

function collideCircle(b: Body, cx: number, cy: number, minDist: number) {
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= minDist * minDist || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  b.x = cx + nx * minDist;
  b.y = cy + ny * minDist;
  bounce(b, nx, ny);
}

function collideSegment(b: Body, [x1, y1, x2, y2]: Wall, r: number) {
  const ex = x2 - x1;
  const ey = y2 - y1;
  const len2 = ex * ex + ey * ey;
  const t = Math.max(0, Math.min(1, ((b.x - x1) * ex + (b.y - y1) * ey) / len2));
  const cx = x1 + ex * t;
  const cy = y1 + ey * t;
  collideCircle(b, cx, cy, r);
}

function bounce(b: Body, nx: number, ny: number) {
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  b.vx -= (1 + WALL_BOUNCE) * vn * nx;
  b.vy -= (1 + WALL_BOUNCE) * vn * ny;
  // 표면을 따라 미끄러질 때 조금씩 느려진다
  b.vx *= 0.995;
  b.vy *= 0.995;
}

function collideMarbles(a: Body, b: Body, r: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const min = r * 2;
  if (d2 >= min * min || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const push = (min - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return;
  const j = (-(1 + MARBLE_BOUNCE) * rel) / 2;
  a.vx -= j * nx;
  a.vy -= j * ny;
  b.vx += j * nx;
  b.vy += j * ny;
}

/** 재생: 경과 시간(ms)에 해당하는 구슬 위치 (프레임 사이 보간) */
export function marblePositions(race: MarbleRace, elapsedMs: number): { x: number; y: number }[] {
  const f = Math.max(0, Math.min(race.frames.length - 1, (elapsedMs / 1000) * race.fps));
  const i = Math.floor(f);
  const t = f - i;
  const a = race.frames[i];
  const b = race.frames[Math.min(i + 1, race.frames.length - 1)];
  return race.names.map((_, k) => ({
    x: (a[k * 2] + (b[k * 2] - a[k * 2]) * t) / 2,
    y: (a[k * 2 + 1] + (b[k * 2 + 1] - a[k * 2 + 1]) * t) / 2,
  }));
}
