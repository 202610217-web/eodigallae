// 사다리 타기의 순수 계산 로직. 무작위 값은 주입받아 테스트할 수 있게 한다.
// 세로줄(레인) n개를 왼쪽→오른쪽 칸(step) 순서로 지나가며, 칸마다 이웃한 레인 사이의 가로줄(rung)을 만나면 건너간다.
// 같은 칸에서 이웃한 가로줄은 만들지 않으므로 어느 레인에서 출발해도 도착 칸이 겹치지 않는다(1:1 대응).

import type { RandomInt } from "./decide";

export interface LadderLayout {
  /** 가로줄이 놓일 수 있는 칸 수 */
  steps: number;
  /** [칸 번호, 사이 번호] — 사이 번호 g는 레인 g와 g+1을 잇는다 */
  rungs: [number, number][];
}

/** 레인 수에 맞는 칸 수. 레인이 많을수록 길게 해서 충분히 섞이게 한다 */
export function ladderSteps(lanes: number): number {
  return Math.min(16, Math.max(6, lanes + 4));
}

export function buildLadder(lanes: number, randomInt: RandomInt): LadderLayout {
  const steps = ladderSteps(lanes);
  const gaps = lanes - 1;
  const taken = new Set<string>();
  const key = (step: number, gap: number) => `${step}:${gap}`;
  const free = (step: number, gap: number) => !taken.has(key(step, gap - 1)) && !taken.has(key(step, gap)) && !taken.has(key(step, gap + 1));

  for (let step = 0; step < steps; step++) {
    for (let gap = 0; gap < gaps; gap++) {
      if (free(step, gap) && randomInt(2) === 0) taken.add(key(step, gap));
    }
  }
  // 어떤 사이에도 가로줄이 하나도 없으면 그 둘은 섞이지 않으므로, 빈 사이마다 하나씩 채운다.
  // 빈 자리가 없으면(양옆 사이가 모든 칸을 차지) 가로줄이 둘 이상인 이웃의 것을 하나 비켜 준다.
  const count = (gap: number) => [...Array(steps).keys()].filter((step) => taken.has(key(step, gap))).length;
  for (let guard = 0; guard < gaps * 4; guard++) {
    const gap = [...Array(gaps).keys()].find((g) => count(g) === 0);
    if (gap === undefined) break;
    const offset = randomInt(steps);
    const order = [...Array(steps).keys()].map((i) => (offset + i) % steps);
    const step =
      order.find((st) => free(st, gap)) ??
      order.find((st) => [gap - 1, gap + 1].every((g) => !taken.has(key(st, g)) || count(g) > 1));
    if (step === undefined) break;
    taken.delete(key(step, gap - 1));
    taken.delete(key(step, gap + 1));
    taken.add(key(step, gap));
  }

  const rungs = [...taken]
    .map((k) => k.split(":").map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { steps, rungs };
}

/** 출발 레인에서 사다리를 따라갔을 때 지나는 레인 (칸마다 도착 레인, 마지막이 도착 칸) */
export function traceLadder(layout: LadderLayout, start: number): number[] {
  const byStep = new Map<number, Set<number>>();
  for (const [step, gap] of layout.rungs) {
    if (!byStep.has(step)) byStep.set(step, new Set());
    byStep.get(step)!.add(gap);
  }
  let lane = start;
  const lanes: number[] = [];
  for (let step = 0; step < layout.steps; step++) {
    const gaps = byStep.get(step);
    if (gaps?.has(lane - 1)) lane -= 1;
    else if (gaps?.has(lane)) lane += 1;
    lanes.push(lane);
  }
  return lanes;
}

export function ladderEnd(layout: LadderLayout, start: number): number {
  const path = traceLadder(layout, start);
  return path.length > 0 ? path[path.length - 1] : start;
}

/** 도착 칸(prizeIndex)에 닿는 출발 레인 */
export function ladderWinner(layout: LadderLayout, lanes: number, prizeIndex: number): number {
  for (let lane = 0; lane < lanes; lane++) if (ladderEnd(layout, lane) === prizeIndex) return lane;
  throw new Error("사다리 도착 칸을 찾을 수 없어요");
}
