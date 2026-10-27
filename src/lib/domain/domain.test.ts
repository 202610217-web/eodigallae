import { describe, expect, it } from "vitest";
import { pickUniform, rouletteRotation, segmentAtPointer, tallyVotes } from "./decide";
import { cardDisplayStatus, decisionPool } from "./evaluate";
import { buildLadder, ladderEnd, ladderSteps, ladderWinner } from "./ladder";
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

// 시드로 재현 가능한 의사 난수 (테스트용)
function seeded(seed: number) {
  let x = seed;
  return (n: number) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x % n;
  };
}

describe("사다리 타기", () => {
  it("어느 레인에서 출발해도 도착 칸이 겹치지 않는다 (1:1)", () => {
    for (let lanes = 1; lanes <= 20; lanes++) {
      for (let seed = 1; seed <= 20; seed++) {
        const layout = buildLadder(lanes, seeded(seed));
        const ends = [...Array(lanes).keys()].map((start) => ladderEnd(layout, start));
        expect(new Set(ends).size).toBe(lanes);
      }
    }
  });

  it("같은 칸에 이웃한 가로줄이 없고, 이웃한 레인 사이마다 가로줄이 하나 이상 있다", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const lanes = 2 + (seed % 19);
      const layout = buildLadder(lanes, seeded(seed));
      expect(layout.steps).toBe(ladderSteps(lanes));
      const set = new Set(layout.rungs.map(([step, gap]) => `${step}:${gap}`));
      for (const [step, gap] of layout.rungs) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(layout.steps);
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThan(lanes - 1);
        expect(set.has(`${step}:${gap + 1}`)).toBe(false);
      }
      for (let gap = 0; gap < lanes - 1; gap++) expect(layout.rungs.some(([, g]) => g === gap)).toBe(true);
    }
  });

  it("당첨 칸에 닿는 출발 레인을 정확히 찾는다", () => {
    const layout = buildLadder(6, seeded(7));
    for (let prize = 0; prize < 6; prize++) expect(ladderEnd(layout, ladderWinner(layout, 6, prize))).toBe(prize);
  });

  it("레인이 하나면 가로줄 없이 그대로 당첨", () => {
    const layout = buildLadder(1, seeded(3));
    expect(layout.rungs).toEqual([]);
    expect(ladderWinner(layout, 1, 0)).toBe(0);
  });

  it("당첨 칸을 고르게 뽑으면 모든 레인의 당첨 확률이 같다", () => {
    const lanes = 4;
    const layout = buildLadder(lanes, seeded(11));
    const wins = Array(lanes).fill(0);
    for (let prize = 0; prize < lanes; prize++) wins[ladderWinner(layout, lanes, prize)] += 1;
    expect(wins).toEqual([1, 1, 1, 1]);
  });
});
