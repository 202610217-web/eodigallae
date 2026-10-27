// 결정 방식(다수결·룰렛)의 순수 계산 로직. 무작위 값은 주입받아 테스트할 수 있게 한다.

/** [0, n) 범위의 균등한 정수를 돌려주는 함수 */
export type RandomInt = (n: number) => number;

export interface Tally {
  counts: { candidateId: string; votes: number }[];
  winners: string[];
  isTie: boolean;
}

/** 후보 풀 안의 표만 집계한다. 풀 밖 후보에 대한 표는 무시한다. */
export function tallyVotes(votes: { candidateId: string }[], pool: string[]): Tally {
  if (pool.length === 0) return { counts: [], winners: [], isTie: false };
  const map = new Map(pool.map((id) => [id, 0]));
  for (const v of votes) {
    if (map.has(v.candidateId)) map.set(v.candidateId, map.get(v.candidateId)! + 1);
  }
  const counts = [...map.entries()]
    .map(([candidateId, n]) => ({ candidateId, votes: n }))
    .sort((a, b) => b.votes - a.votes);
  const top = counts[0].votes;
  const winners = counts.filter((c) => c.votes === top).map((c) => c.candidateId);
  return { counts, winners, isTie: winners.length > 1 };
}

export function pickUniform<T>(items: T[], randomInt: RandomInt): { item: T; index: number } {
  if (items.length === 0) throw new Error("빈 목록에서는 고를 수 없어요");
  const index = randomInt(items.length);
  if (!Number.isInteger(index) || index < 0 || index >= items.length) throw new Error("잘못된 난수");
  return { item: items[index], index };
}

/**
 * 이미 정해진 당첨 칸이 화면 위쪽 포인터에 오도록 하는 회전 각도.
 * 결과는 서버에서 먼저 정해지고, 각도는 그 결과를 보여주기만 한다.
 * jitter(-0.5~0.5)는 칸 안에서 멈추는 위치만 바꾸고 다른 칸으로 넘어가지 않는다.
 */
export function rouletteRotation(winnerIndex: number, n: number, turns = 5, jitter = 0): number {
  const seg = 360 / n;
  const safeJitter = Math.max(-0.35, Math.min(0.35, jitter));
  const center = (winnerIndex + 0.5 + safeJitter) * seg;
  return turns * 360 + (360 - center);
}

/** 회전 각도에서 포인터(위쪽)가 가리키는 칸 번호 — 테스트용 역산 */
export function segmentAtPointer(rotation: number, n: number): number {
  const seg = 360 / n;
  const angle = (((360 - (rotation % 360)) % 360) + 360) % 360;
  return Math.floor(angle / seg) % n;
}
