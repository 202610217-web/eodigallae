import { describe, expect, it } from "vitest";
import { BATTLE_COUNTDOWN_MS, BATTLE_GRACE_MS, BATTLE_MAX_TAPS_PER_SEC, BATTLE_TAP_MS } from "./constants";
import {
  acceptedTaps,
  pickUniform,
  rankBattle,
  rouletteRotation,
  segmentAtPointer,
  tallyVotes,
} from "./decide";
import { cardDisplayStatus, decisionPool } from "./evaluate";
import { marblePositions, simulateMarbleRace } from "./marble";
import { aggregateOpinions, normalizeAnswers, normalizeQuestions } from "./opinion";
import type { OpinionAnswers, OpinionQuestion } from "./types";

const members = [{ id: "a" }, { id: "b" }, { id: "c" }];

// 테스트용 id: q1, q2 … / o1, o2 …
function idMaker() {
  const n: Record<string, number> = {};
  return (prefix: string) => `${prefix}${(n[prefix] = (n[prefix] ?? 0) + 1)}`;
}

function questions(): OpinionQuestion[] {
  const r = normalizeQuestions(
    [
      { title: "예산", multiple: false, options: ["1만 원 이하", "2만 원 이하"] },
      { title: "피할 음식", multiple: true, options: ["날것", "해산물", "매운 음식"] },
    ],
    idMaker(),
  );
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

describe("의견 투표 질문 만들기", () => {
  it("방장이 적은 질문·보기를 그대로 쓰고 앞뒤 공백만 정리한다", () => {
    const r = normalizeQuestions([{ title: "  침대 개수 ", multiple: false, options: [" 1개", "2개 "] }], idMaker());
    expect(r).toEqual({
      ok: true,
      value: [{ id: "q1", title: "침대 개수", multiple: false, options: [{ id: "o1", label: "1개" }, { id: "o2", label: "2개" }] }],
    });
  });

  it("빈 이름·빈 보기·보기 부족·중복·‘기타’ 보기·과도한 길이와 개수를 거절한다", () => {
    const bad = (q: { title: string; multiple?: boolean; options: string[] }[]) =>
      normalizeQuestions(q.map((x) => ({ multiple: false, ...x })), idMaker()).ok;
    expect(bad([{ title: " ", options: ["a", "b"] }])).toBe(false);
    expect(bad([{ title: "예산", options: ["a", " "] }])).toBe(false);
    expect(bad([{ title: "예산", options: ["a"] }])).toBe(false);
    expect(bad([{ title: "예산", options: ["한식", " 한식 "] }])).toBe(false);
    expect(bad([{ title: "예산", options: ["a", "b"] }, { title: "예산 ", options: ["c", "d"] }])).toBe(false);
    expect(bad([{ title: "메뉴", options: ["한식", "기타"] }])).toBe(false);
    expect(bad([{ title: "가".repeat(31), options: ["a", "b"] }])).toBe(false);
    expect(bad([{ title: "메뉴", options: ["a", "나".repeat(31)] }])).toBe(false);
    expect(bad([{ title: "메뉴", options: Array.from({ length: 11 }, (_, i) => `보기 ${i}`) }])).toBe(false);
    expect(bad(Array.from({ length: 11 }, (_, i) => ({ title: `질문 ${i}`, options: ["a", "b"] })))).toBe(false);
    expect(bad([])).toBe(true);
  });
});

describe("의견 제출 검사", () => {
  const qs = questions();
  const [budget, avoid] = qs;
  const ans = (patch: OpinionAnswers = {}): OpinionAnswers => ({
    [budget.id]: { optionIds: [budget.options[0].id], other: null },
    [avoid.id]: { optionIds: [avoid.options[0].id], other: null },
    ...patch,
  });

  it("모든 질문에 답해야 한다", () => {
    const partial = Object.fromEntries(Object.entries(ans()).filter(([id]) => id !== avoid.id));
    expect(normalizeAnswers(qs, partial)).toMatchObject({ ok: false });
  });

  it("단일 선택은 보기·기타 중 하나만, 복수 선택은 보기 여러 개와 기타를 함께 고를 수 있다", () => {
    expect(normalizeAnswers(qs, ans({ [budget.id]: { optionIds: [budget.options[0].id, budget.options[1].id], other: null } })).ok).toBe(false);
    expect(normalizeAnswers(qs, ans({ [budget.id]: { optionIds: [budget.options[0].id], other: "1만 5천 원" } })).ok).toBe(false);
    expect(normalizeAnswers(qs, ans({ [budget.id]: { optionIds: [], other: "1만 5천 원" } })).ok).toBe(true);
    const multi = normalizeAnswers(qs, ans({ [avoid.id]: { optionIds: avoid.options.map((o) => o.id), other: "고수" } }));
    expect(multi.ok && multi.value[avoid.id]).toEqual({ optionIds: avoid.options.map((o) => o.id), other: "고수" });
  });

  it("아무것도 고르지 않거나 기타 내용이 비면 거절한다", () => {
    expect(normalizeAnswers(qs, ans({ [avoid.id]: { optionIds: [], other: null } })).ok).toBe(false);
    expect(normalizeAnswers(qs, ans({ [avoid.id]: { optionIds: [], other: "   " } })).ok).toBe(false);
  });

  it("같은 보기를 여러 번 보내도 한 번으로 정리하고, 없는 보기·질문은 거절한다", () => {
    const dup = normalizeAnswers(qs, ans({ [avoid.id]: { optionIds: [avoid.options[1].id, avoid.options[1].id, avoid.options[0].id], other: null } }));
    expect(dup.ok && dup.value[avoid.id].optionIds).toEqual([avoid.options[0].id, avoid.options[1].id]);
    expect(normalizeAnswers(qs, ans({ [avoid.id]: { optionIds: ["o999"], other: null } })).ok).toBe(false);
    expect(normalizeAnswers(qs, ans({ q999: { optionIds: [], other: "x" } })).ok).toBe(false);
  });

  it("질문이 없으면 제출할 수 없다", () => {
    expect(normalizeAnswers([], {}).ok).toBe(false);
  });
});

describe("의견 익명 집계", () => {
  const qs = questions();
  const [budget, avoid] = qs;

  it("보기별 선택 인원·기타 인원·기타 원문을 세고, 복수 선택은 합이 응답자 수보다 클 수 있다", () => {
    const responses: OpinionAnswers[] = [
      { [budget.id]: { optionIds: [budget.options[0].id], other: null }, [avoid.id]: { optionIds: [avoid.options[0].id, avoid.options[1].id], other: null } },
      { [budget.id]: { optionIds: [budget.options[1].id], other: null }, [avoid.id]: { optionIds: [avoid.options[0].id, avoid.options[2].id], other: "고수" } },
      { [budget.id]: { optionIds: [], other: "1만 5천 원 정도면 좋겠어요" }, [avoid.id]: { optionIds: [avoid.options[0].id], other: null } },
    ];
    const r = aggregateOpinions(qs, responses);
    expect(r.respondents).toBe(3);
    expect(r.questions[0]).toEqual({
      questionId: budget.id,
      options: [
        { optionId: budget.options[0].id, count: 1 },
        { optionId: budget.options[1].id, count: 1 },
      ],
      otherCount: 1,
      otherTexts: ["1만 5천 원 정도면 좋겠어요"],
    });
    expect(r.questions[1].options.map((o) => o.count)).toEqual([3, 1, 1]);
    expect(r.questions[1].options.reduce((s, o) => s + o.count, 0)).toBeGreaterThan(r.respondents);
    expect(r.questions[1].otherTexts).toEqual(["고수"]);
  });

  it("집계에는 누가 골랐는지 담지 않고, 기타 의견은 제출 순서가 아닌 글자 순서로 보여준다", () => {
    const r = aggregateOpinions(qs, [
      { [budget.id]: { optionIds: [], other: "하" }, [avoid.id]: { optionIds: [avoid.options[0].id], other: null } },
      { [budget.id]: { optionIds: [], other: "가" }, [avoid.id]: { optionIds: [avoid.options[0].id], other: null } },
    ]);
    expect(r.questions[0].otherTexts).toEqual(["가", "하"]);
    expect(JSON.stringify(r)).not.toMatch(/memberId|member_id/);
  });

  it("응답이 없으면 모두 0", () => {
    const r = aggregateOpinions(qs, []);
    expect(r.respondents).toBe(0);
    expect(r.questions.every((q) => q.otherCount === 0 && q.options.every((o) => o.count === 0))).toBe(true);
  });
});

describe("결정 대상 후보", () => {
  it("등록 순서대로 모두 넣고, 방장이 뺀 후보만 제외한다", () => {
    const cands = [
      { id: "c", createdAt: 3 },
      { id: "a", createdAt: 1 },
      { id: "b", createdAt: 2 },
    ];
    expect(decisionPool(cands)).toEqual(["a", "b", "c"]);
    expect(decisionPool(cands, ["b"])).toEqual(["a", "c"]);
    expect(decisionPool([])).toEqual([]);
  });
});

describe("구슬 레이스", () => {
  const entries = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: `후보 ${id}` }));

  it("같은 시드면 같은 레이스, 모든 구슬이 한 번씩 순위에 들어감", () => {
    const a = simulateMarbleRace(entries, 1234);
    const b = simulateMarbleRace(entries, 1234);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect([...a.order].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(a.durationMs).toBeGreaterThan(5_000);
    expect(a.durationMs).toBeLessThan(90_000);
  });

  it("재생 위치는 프레임 사이를 보간하고 범위를 벗어나면 처음/끝에 고정", () => {
    const race = simulateMarbleRace(entries, 99);
    expect(marblePositions(race, -500)).toEqual(marblePositions(race, 0));
    const end = marblePositions(race, race.durationMs + 10_000);
    expect(end.every((p) => p.y >= race.finishY)).toBe(true);
  });
});

describe("카드 상태", () => {
  it("전원이 의견을 제출해야 후보 확인 단계 (다른 사람·다른 카드 제출은 대신하지 않음)", () => {
    expect(cardDisplayStatus("open", members, ["a", "b"])).toBe("collecting");
    expect(cardDisplayStatus("open", members, ["a", "b", "c"])).toBe("reviewing");
    expect(cardDisplayStatus("open", members, ["a", "b", "x"])).toBe("collecting");
    expect(cardDisplayStatus("open", [], [])).toBe("collecting");
    expect(cardDisplayStatus("deciding", members, [])).toBe("deciding");
    expect(cardDisplayStatus("confirmed", members, [])).toBe("confirmed");
  });
});

describe("다수결 집계", () => {
  it("최다 득표 후보가 하나면 당첨", () => {
    const t = tallyVotes([{ candidateId: "x" }, { candidateId: "x" }, { candidateId: "y" }], ["x", "y"]);
    expect(t.winners).toEqual(["x"]);
    expect(t.isTie).toBe(false);
  });

  it("동점이면 동점 후보만 추린다", () => {
    const t = tallyVotes([{ candidateId: "x" }, { candidateId: "y" }], ["x", "y", "z"]);
    expect(t.isTie).toBe(true);
    expect(t.winners.sort()).toEqual(["x", "y"]);
  });

  it("풀 밖 후보에 대한 표는 무시한다", () => {
    const t = tallyVotes([{ candidateId: "banned" }, { candidateId: "banned" }, { candidateId: "x" }], ["x", "y"]);
    expect(t.winners).toEqual(["x"]);
  });

  it("빈 풀은 당첨 없음", () => {
    expect(tallyVotes([], []).winners).toEqual([]);
  });
});

describe("룰렛", () => {
  it("모든 칸이 같은 확률로 뽑힌다 (난수 그대로 사용)", () => {
    const items = ["a", "b", "c", "d"];
    for (let i = 0; i < items.length; i++) {
      expect(pickUniform(items, () => i).item).toBe(items[i]);
    }
    expect(() => pickUniform([], () => 0)).toThrow();
    expect(() => pickUniform(items, () => 4)).toThrow();
  });

  it("회전 각도는 미리 정한 당첨 칸에서 멈춘다", () => {
    for (const n of [2, 3, 5, 8]) {
      for (let w = 0; w < n; w++) {
        for (const jitter of [-0.5, -0.2, 0, 0.2, 0.5]) {
          expect(segmentAtPointer(rouletteRotation(w, n, 6, jitter), n)).toBe(w);
        }
      }
    }
  });
});

describe("결정권 쟁탈전", () => {
  const t0 = 1_000_000;
  const start = t0 + BATTLE_COUNTDOWN_MS;
  const end = start + BATTLE_TAP_MS;

  it("카운트다운 중 입력은 인정하지 않는다", () => {
    expect(acceptedTaps({ requested: 5, now: t0 + 1000, lastAcceptedAt: null, phaseStartedAt: t0 })).toBe(0);
  });

  it("사람이 낼 수 없는 속도는 상한으로 자른다", () => {
    const n = acceptedTaps({ requested: 999, now: start + 1000, lastAcceptedAt: null, phaseStartedAt: t0 });
    expect(n).toBe(BATTLE_MAX_TAPS_PER_SEC);
  });

  it("정상 속도는 그대로 인정한다", () => {
    expect(acceptedTaps({ requested: 4, now: start + 500, lastAcceptedAt: null, phaseStartedAt: t0 })).toBe(4);
  });

  it("종료 후에는 종료 시각까지의 몫만 인정하고, 유예 시간이 지나면 0", () => {
    const late = acceptedTaps({ requested: 50, now: end + 500, lastAcceptedAt: end - 200, phaseStartedAt: t0 });
    expect(late).toBe(3); // 0.2초 × 초당 15회
    expect(acceptedTaps({ requested: 5, now: end + 100, lastAcceptedAt: end, phaseStartedAt: t0 })).toBe(0);
    expect(acceptedTaps({ requested: 5, now: end + BATTLE_GRACE_MS + 1, lastAcceptedAt: end - 2000, phaseStartedAt: t0 })).toBe(0);
  });

  it("입력을 모아 두었다가 몰아서 보내면 최근 1초 분량만 인정", () => {
    const n = acceptedTaps({ requested: 150, now: end + 300, lastAcceptedAt: null, phaseStartedAt: t0 });
    expect(n).toBe(BATTLE_MAX_TAPS_PER_SEC);
  });

  // 서버처럼 인정된 묶음만 마지막 인정 시각을 갱신하며 계속 보낸다
  function sendEvery(intervalMs: number, perBatch: number, untilMs = BATTLE_TAP_MS + BATTLE_GRACE_MS) {
    let total = 0;
    let lastAcceptedAt: number | null = null;
    for (let t = start + intervalMs; t <= start + untilMs; t += intervalMs) {
      const n = acceptedTaps({ requested: perBatch, now: t, lastAcceptedAt, phaseStartedAt: t0 });
      if (n > 0) {
        total += n;
        lastAcceptedAt = t;
      }
    }
    return total;
  }

  it("묶음 간격과 상관없이 3초 동안 인정되는 합은 초당 15회 상한(45회)을 넘지 않는다", () => {
    const max = (BATTLE_TAP_MS / 1000) * BATTLE_MAX_TAPS_PER_SEC;
    for (const interval of [10, 33, 50, 100, 250, 340, 700]) {
      expect(sendEvery(interval, 100)).toBeLessThanOrEqual(max);
    }
    // 요청을 아주 잘게(10ms마다) 나눠 보내도 1회씩 더 받는 이득이 없다
    expect(sendEvery(10, 100)).toBe(max);
  });

  it("상한 안의 정상 속도는 그대로 다 인정한다", () => {
    // 초당 10회: 0.3초마다 3회씩
    expect(sendEvery(300, 3, BATTLE_TAP_MS)).toBe(30);
  });

  it("음수·NaN 입력은 0", () => {
    expect(acceptedTaps({ requested: -3, now: start + 500, lastAcceptedAt: null, phaseStartedAt: t0 })).toBe(0);
    expect(acceptedTaps({ requested: NaN, now: start + 500, lastAcceptedAt: null, phaseStartedAt: t0 })).toBe(0);
  });

  it("최다 횟수가 우승, 동점이면 동점자 중에서만 고른다", () => {
    const entries = [
      { memberId: "a", taps: 40 },
      { memberId: "b", taps: 52 },
      { memberId: "c", taps: 52 },
    ];
    const r0 = rankBattle(entries, () => 0);
    const r1 = rankBattle(entries, () => 1);
    expect(r0.tiedTop).toEqual(["b", "c"]);
    expect(r0.winnerId).toBe("b");
    expect(r1.winnerId).toBe("c");
    expect(r1.ranking[0].memberId).toBe("c");
    expect(rankBattle([], () => 0).winnerId).toBeNull();
  });
});
