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
import {
  cardDisplayStatus,
  decisionPool,
  evaluateCandidate,
  evaluateCandidates,
  memberTasteScore,
} from "./evaluate";
import type { Candidate, Member, MemberCondition } from "./types";

const members: Pick<Member, "id" | "nickname" | "taste">[] = [
  { id: "a", nickname: "민지", taste: ["food", "photo", "nature"] },
  { id: "b", nickname: "준호", taste: ["rest", "food", "shopping"] },
  { id: "c", nickname: "서연", taste: ["nature", "photo", "culture"] },
];

function cond(memberId: string, patch: Partial<MemberCondition> = {}): MemberCondition {
  return {
    memberId,
    cardId: "card",
    maxBudget: null,
    restrictions: [],
    setting: "any",
    vibe: "any",
    wish: "",
    note: "",
    ready: true,
    updatedAt: 0,
    ...patch,
  };
}

function cand(id: string, patch: Partial<Candidate> = {}): Candidate {
  return {
    id,
    cardId: "card",
    createdBy: "a",
    name: id,
    cost: 10000,
    tags: [],
    features: [],
    notes: {},
    setting: "unknown",
    vibe: "unknown",
    link: "",
    description: "",
    createdAt: 0,
    ...patch,
  };
}

const allConds = members.map((m) => cond(m.id));

describe("취향 점수", () => {
  it("1·2·3순위 일치에 3·2·1점을 준다", () => {
    expect(memberTasteScore(["food", "photo", "nature"], ["food"])).toBe(3);
    expect(memberTasteScore(["food", "photo", "nature"], ["photo", "nature"])).toBe(3);
    expect(memberTasteScore(["food", "photo", "nature"], ["shopping"])).toBe(0);
    expect(memberTasteScore(null, ["food"])).toBe(0);
  });

  it("참가자 점수를 합산하고 일치 인원을 센다", () => {
    const e = evaluateCandidate(cand("x", { tags: ["food", "shopping"] }), {
      category: "meal",
      members,
      conditions: allConds,
    });
    // 민지 3, 준호 2+1, 서연 0
    expect(e.tasteScore).toBe(6);
    expect(e.matchedMembers).toBe(2);
    expect(e.reasons.map((r) => r.text)).toContain("3명 중 2명의 선호 취향과 일치");
  });
});

describe("필수 조건 검사", () => {
  it("예산 초과는 충돌로 판정하고 이유를 남긴다", () => {
    const conditions = [cond("a", { maxBudget: 20000 }), cond("b", { maxBudget: 5000 }), cond("c", { maxBudget: 8000 })];
    const e = evaluateCandidate(cand("x", { cost: 10000 }), { category: "meal", members, conditions });
    expect(e.state).toBe("conflict");
    expect(e.conflicts).toHaveLength(2);
    expect(e.reasons[0].text).toBe("예산 조건 2건과 충돌");
  });

  it("예산과 같은 금액은 통과한다", () => {
    const conditions = members.map((m) => cond(m.id, { maxBudget: 10000 }));
    const e = evaluateCandidate(cand("x", { cost: 10000 }), { category: "meal", members, conditions });
    expect(e.state).toBe("pass");
    expect(e.reasons.map((r) => r.text)).toContain("전원 예산 조건 충족");
  });

  it("제외 음식과 겹치면 충돌", () => {
    const conditions = [cond("a", { restrictions: ["해산물"] }), cond("b"), cond("c")];
    const e = evaluateCandidate(cand("x", { features: ["해산물", "매운 음식"] }), {
      category: "meal",
      members,
      conditions,
    });
    expect(e.state).toBe("conflict");
    expect(e.reasons.map((r) => r.text)).toContain("제외 음식 조건과 충돌");
  });

  it("비용 정보가 없으면 적합으로 보지 않고 확인 필요", () => {
    const conditions = [cond("a", { maxBudget: 10000 }), cond("b"), cond("c")];
    const e = evaluateCandidate(cand("x", { cost: null }), { category: "meal", members, conditions });
    expect(e.state).toBe("needs_check");
  });

  it("후보 특징 정보가 없고 누군가 제외 조건이 있으면 확인 필요", () => {
    const conditions = [cond("a", { restrictions: ["음주"] }), cond("b"), cond("c")];
    const e = evaluateCandidate(cand("x", { features: null }), { category: "activity", members, conditions });
    expect(e.state).toBe("needs_check");
  });

  it("아무도 제한이 없으면 비용·특징 정보가 없어도 통과", () => {
    const e = evaluateCandidate(cand("x", { cost: null, features: null }), {
      category: "activity",
      members,
      conditions: allConds,
    });
    expect(e.state).toBe("pass");
  });

  it("조건을 입력하지 않은 참가자가 있으면 확인 필요", () => {
    const e = evaluateCandidate(cand("x"), { category: "meal", members, conditions: [cond("a")] });
    expect(e.state).toBe("needs_check");
    expect(e.needsCheck[0]).toContain("2명");
  });

  it("충돌은 확인 필요보다 우선한다", () => {
    const conditions = [cond("a", { maxBudget: 1000 })];
    const e = evaluateCandidate(cand("x"), { category: "meal", members, conditions });
    expect(e.state).toBe("conflict");
  });

  it("선호 조건은 후보를 차단하지 않는다", () => {
    const conditions = members.map((m) => cond(m.id, { setting: "indoor", vibe: "quiet" }));
    const e = evaluateCandidate(cand("x", { setting: "outdoor", vibe: "lively" }), {
      category: "activity",
      members,
      conditions,
    });
    expect(e.state).toBe("pass");
    expect(e.tasteScore).toBe(0);
  });
});

describe("후보 순위와 결정 대상", () => {
  it("통과 > 확인 필요 > 충돌 순이고, 문제 있는 후보도 자동으로 빠지지 않음 (방장이 고른 것만 제외)", () => {
    const conditions = [cond("a", { maxBudget: 15000 }), cond("b"), cond("c")];
    const evals = evaluateCandidates({
      category: "meal",
      members,
      conditions,
      candidates: [
        cand("over", { cost: 30000, tags: ["food"] }),
        cand("unknown", { cost: null, tags: ["food"] }),
        cand("low", { cost: 9000, tags: ["shopping"] }),
        cand("best", { cost: 9000, tags: ["food", "nature"] }),
      ],
    });
    expect(evals.map((e) => e.candidateId)).toEqual(["best", "low", "unknown", "over"]);
    expect(decisionPool(evals)).toEqual(["best", "low", "unknown", "over"]);
    expect(decisionPool(evals, ["unknown", "over", "없는-id"])).toEqual(["best", "low"]);
    expect(evals.filter((e) => e.recommended).map((e) => e.candidateId)).toEqual(["best"]);
  });

  it("기타로 적은 비용·특징은 확인 필요 이유에 그대로 보여줌", () => {
    const conditions = [cond("a", { maxBudget: 15000, restrictions: ["해산물"] }), cond("b"), cond("c")];
    const e = evaluateCandidate(cand("x", { cost: null, features: null, notes: { cost: "메뉴마다 달라요", features: "시장 안 여러 가게" } }), {
      category: "meal",
      members,
      conditions,
    });
    expect(e.state).toBe("needs_check");
    expect(e.needsCheck.some((t) => t.includes("메뉴마다 달라요"))).toBe(true);
    expect(e.needsCheck.some((t) => t.includes("시장 안 여러 가게"))).toBe(true);
  });

  it("특징 '있음'의 기타 항목은 충돌로 보지 않고 참고로만 보여줌", () => {
    const conditions = [cond("a", { restrictions: ["해산물"] }), cond("b"), cond("c")];
    const e = evaluateCandidate(cand("x", { features: [], notes: { features: "고수" } }), { category: "meal", members, conditions });
    expect(e.state).toBe("pass");
    expect(e.reasons.some((r) => r.tone === "info" && r.text.includes("고수"))).toBe(true);
  });

  it("후보가 없으면 빈 배열", () => {
    expect(evaluateCandidates({ category: "meal", members, conditions: allConds, candidates: [] })).toEqual([]);
  });

  it("모든 후보가 충돌하면 추천은 없지만 결정 대상에는 포함", () => {
    const conditions = members.map((m) => cond(m.id, { maxBudget: 1000 }));
    const evals = evaluateCandidates({
      category: "meal",
      members,
      conditions,
      candidates: [cand("x", { tags: ["food"] }), cand("y")],
    });
    expect(decisionPool(evals)).toEqual(["x", "y"]);
    expect(evals.some((e) => e.recommended)).toBe(false);
  });
});

describe("카드 상태", () => {
  it("전원이 준비 완료해야 후보 확인 단계", () => {
    expect(cardDisplayStatus("open", members, [cond("a"), cond("b")])).toBe("collecting");
    expect(cardDisplayStatus("open", members, allConds)).toBe("reviewing");
    expect(cardDisplayStatus("open", members, [cond("a"), cond("b"), cond("c", { ready: false })])).toBe("collecting");
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
    expect(late).toBe(Math.ceil(0.2 * BATTLE_MAX_TAPS_PER_SEC));
    expect(acceptedTaps({ requested: 5, now: end + 100, lastAcceptedAt: end, phaseStartedAt: t0 })).toBe(0);
    expect(acceptedTaps({ requested: 5, now: end + BATTLE_GRACE_MS + 1, lastAcceptedAt: end - 2000, phaseStartedAt: t0 })).toBe(0);
  });

  it("입력을 모아 두었다가 몰아서 보내면 최근 1초 분량만 인정", () => {
    const n = acceptedTaps({ requested: 150, now: end + 300, lastAcceptedAt: null, phaseStartedAt: t0 });
    expect(n).toBe(BATTLE_MAX_TAPS_PER_SEC);
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
