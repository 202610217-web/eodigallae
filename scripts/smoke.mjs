// 실행 중인 서버에 여러 참가자(쿠키 분리)로 접속해 전체 흐름과 예외 상황을 검증한다.
// 사용법: npm run dev 실행 후 → BASE_URL=http://localhost:3000 npm run smoke

import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let passed = 0;

class Client {
  constructor(name) {
    this.name = name;
    this.cookies = new Map();
  }
  async req(path, body) {
    const res = await fetch(BASE + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }
  state(roomId) {
    return this.req(`/api/rooms/${roomId}/state`);
  }
  act(roomId, action) {
    return this.req(`/api/rooms/${roomId}/actions`, action);
  }
}

async function check(label, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = (nickname, character = "cat", color = "coral") => ({ nickname, character, color });
const cond = (cardId, patch = {}) => ({
  type: "saveCondition",
  condition: { cardId, maxBudget: null, restrictions: [], setting: "any", vibe: "any", wish: "", note: "", ready: true, ...patch },
});
const cand = (name, patch = {}) => ({
  name,
  cost: 10000,
  tags: ["food"],
  features: [],
  setting: "indoor",
  vibe: "quiet",
  link: "",
  description: "",
  ...patch,
});

const host = new Client("host");
const alice = new Client("alice");
const bob = new Client("bob");
const stranger = new Client("stranger");

console.log(`smoke test → ${BASE}`);

// ── 모임 생성·참여 ──
const created = await host.req("/api/rooms", {
  name: "스모크 테스트 여행",
  tripStart: "2026-11-07",
  tripEnd: "2026-11-08",
  cards: [
    { title: "토요일 점심", category: "meal" },
    { title: "오후 활동", category: "activity" },
    { title: "저녁 식사", category: "meal" },
    { title: "숙소", category: "stay" },
  ],
  host: profile("방장", "dog", "sky"),
});
const roomId = created.data.roomId;
const code = created.data.inviteCode;

await check("모임 생성 + 참여 쿠키 발급", () => {
  assert.equal(created.status, 200);
  assert.match(code, /^[2-9A-Z]{6}$/);
  assert.equal(host.cookies.size, 1);
});

await check("잘못된 입력은 400 (종료일이 시작일보다 빠름)", async () => {
  const r = await host.req("/api/rooms", { name: "x", tripStart: "2026-11-08", tripEnd: "2026-11-01", cards: [{ title: "a", category: "meal" }], host: profile("a") });
  assert.equal(r.status, 400);
});

await check("유효하지 않은 초대 코드는 404", async () => {
  const r = await stranger.req("/api/invite/ZZZZZZ");
  assert.equal(r.status, 404);
});

await check("초대 코드로 참여 (가입 없이)", async () => {
  const preview = await alice.req(`/api/invite/${code.toLowerCase()}`);
  assert.equal(preview.data.name, "스모크 테스트 여행");
  assert.equal((await alice.req(`/api/invite/${code}/join`, profile("앨리스", "rabbit"))).status, 200);
  assert.equal((await bob.req(`/api/invite/${code}/join`, profile("밥", "bird"))).status, 200);
});

await check("같은 닉네임은 거절", async () => {
  const r = await stranger.req(`/api/invite/${code}/join`, profile("앨리스"));
  assert.equal(r.status, 409);
});

await check("참가자가 아니면 상태 조회 불가 (닉네임이 아닌 토큰으로 식별)", async () => {
  const r = await stranger.state(roomId);
  assert.equal(r.status, 401);
  assert.equal(r.data.code, "NOT_MEMBER");
});

let s = (await host.state(roomId)).data;
const [lunch, activity, dinner, stay] = s.cards.map((c) => c.id);

await check("상태 응답에 토큰·해시가 노출되지 않음", () => {
  const raw = JSON.stringify(s);
  assert.ok(!raw.includes("token"));
  assert.equal(s.members.length, 3);
});

// ── 취향 ──
await check("취향 1~3순위 저장, 중복 순위는 거절", async () => {
  assert.equal((await host.act(roomId, { type: "setTaste", ranks: ["food", "rest", "photo"] })).status, 200);
  assert.equal((await alice.act(roomId, { type: "setTaste", ranks: ["food", "nature", "photo"] })).status, 200);
  assert.equal((await bob.act(roomId, { type: "setTaste", ranks: ["shopping", "food", "rest"] })).status, 200);
  assert.equal((await bob.act(roomId, { type: "setTaste", ranks: ["food", "food", "rest"] })).status, 400);
  // 순서 변경
  assert.equal((await host.act(roomId, { type: "setTaste", ranks: ["rest", "food", "photo"] })).status, 200);
  s = (await host.state(roomId)).data;
  assert.deepEqual(s.me.taste, ["rest", "food", "photo"]);
});

// ── 조건 + 후보 + 판정 ──
await check("조건 저장 → 준비 상태가 카드별로 분리됨", async () => {
  await host.act(roomId, cond(lunch, { maxBudget: 20000 }));
  await alice.act(roomId, cond(lunch, { maxBudget: 15000, restrictions: ["해산물"], ready: false }));
  s = (await host.state(roomId)).data;
  assert.equal(s.cards[0].status, "collecting");
  await alice.act(roomId, { type: "setConditionReady", cardId: lunch, ready: true });
  await bob.act(roomId, cond(lunch));
  s = (await host.state(roomId)).data;
  assert.equal(s.cards[0].status, "reviewing");
  assert.equal(s.cards[1].status, "collecting");
});

await check("허용되지 않은 제외 조건 값은 거절", async () => {
  const r = await bob.act(roomId, cond(lunch, { restrictions: ["없는 항목"] }));
  assert.equal(r.status, 400);
});

const addCand = async (client, cardId, c) => assert.equal((await client.act(roomId, { type: "addCandidate", cardId, candidate: c })).status, 200);
await addCand(alice, lunch, cand("통과 A", { cost: 12000, tags: ["food", "rest"] }));
await addCand(bob, lunch, cand("예산 초과 B", { cost: 18000 }));
await addCand(bob, lunch, cand("해산물 C", { cost: 10000, features: ["해산물"] }));
await addCand(host, lunch, cand("비용 모름 D", { cost: null }));
await addCand(host, lunch, cand("통과 E", { cost: 9000, tags: ["shopping"] }));

s = (await host.state(roomId)).data;
const byName = (card, name) => card.candidates.find((c) => c.name === name);
const evalOf = (card, name) => card.evaluations.find((e) => e.candidateId === byName(card, name).id);
const lunchCard = s.cards[0];

await check("필수 조건 판정: 통과 / 예산 충돌 / 음식 충돌 / 확인 필요", () => {
  assert.equal(evalOf(lunchCard, "통과 A").state, "pass");
  assert.equal(evalOf(lunchCard, "예산 초과 B").state, "conflict");
  assert.ok(evalOf(lunchCard, "예산 초과 B").reasons.some((r) => r.text === "예산 조건 1건과 충돌"));
  assert.equal(evalOf(lunchCard, "해산물 C").state, "conflict");
  assert.ok(evalOf(lunchCard, "해산물 C").reasons.some((r) => r.text === "제외 음식 조건과 충돌"));
  assert.equal(evalOf(lunchCard, "비용 모름 D").state, "needs_check");
});

await check("취향 점수와 추천 이유", () => {
  const a = evalOf(lunchCard, "통과 A");
  // 방장 rest(3)+food(2)=5, 앨리스 food 3, 밥 food(2)+rest(1)=3 → 11
  assert.equal(a.tasteScore, 11);
  assert.ok(a.reasons.some((r) => r.text === "3명 중 3명의 선호 취향과 일치"));
  assert.ok(a.reasons.some((r) => r.text === "전원 예산 조건 충족"));
  assert.equal(a.recommended, true);
  assert.equal(lunchCard.evaluations[0].candidateId, byName(lunchCard, "통과 A").id);
});

await check("다른 사람의 후보는 수정 불가 (방장은 가능)", async () => {
  const id = byName(lunchCard, "예산 초과 B").id;
  assert.equal((await alice.act(roomId, { type: "deleteCandidate", candidateId: id })).status, 403);
  assert.equal((await host.act(roomId, { type: "updateCandidate", candidateId: id, candidate: cand("예산 초과 B", { cost: 19000 }) })).status, 200);
});

// ── 다수결 ──
await check("방장만 결정 시작 가능", async () => {
  assert.equal((await alice.act(roomId, { type: "startDecision", cardId: lunch, mode: "vote" })).status, 403);
  assert.equal((await host.act(roomId, { type: "startDecision", cardId: lunch, mode: "vote" })).status, 200);
  s = (await host.state(roomId)).data;
  assert.equal(s.cards[0].pool.length, 2); // 통과 A, 통과 E 만
});

await check("결정 중에는 후보·조건 수정 잠금", async () => {
  assert.equal((await bob.act(roomId, cond(lunch, { maxBudget: 1000 }))).status, 409);
  assert.equal((await bob.act(roomId, { type: "addCandidate", cardId: lunch, candidate: cand("늦은 후보") })).status, 409);
});

const A = byName(lunchCard, "통과 A").id;
const E = byName(lunchCard, "통과 E").id;
const B = byName(lunchCard, "예산 초과 B").id;

await check("충돌 후보에는 투표 불가", async () => {
  assert.equal((await bob.act(roomId, { type: "castVote", cardId: lunch, candidateId: B })).status, 400);
});

await check("투표 중에는 득표수·남의 선택이 숨겨짐, 참여 인원만 공개", async () => {
  await host.act(roomId, { type: "castVote", cardId: lunch, candidateId: A });
  await alice.act(roomId, { type: "castVote", cardId: lunch, candidateId: E });
  const v = (await bob.state(roomId)).data.cards[0].voting;
  assert.equal(v.votedCount, 2);
  assert.equal(v.counts, null);
  assert.equal(v.myVoteCandidateId, null);
});

await check("중복 투표는 서버에서 거절", async () => {
  const r = await host.act(roomId, { type: "castVote", cardId: lunch, candidateId: E });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "ALREADY_VOTED");
});

await check("동시에 같은 사람이 여러 번 투표해도 1표만 기록", async () => {
  const results = await Promise.all([1, 2, 3].map(() => bob.act(roomId, { type: "castVote", cardId: lunch, candidateId: A })));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
});

await check("전원 투표 시 자동 마감 → 최다 득표 결과 공개", async () => {
  s = (await host.state(roomId)).data;
  const c = s.cards[0];
  assert.equal(c.phase, "result");
  assert.equal(c.result.candidate.name, "통과 A");
  assert.equal(c.result.detail.kind, "vote");
  assert.deepEqual(c.voting.counts.map((x) => x.votes), [2, 1]);
});

await check("확정은 방장만, 한 번만", async () => {
  assert.equal((await alice.act(roomId, { type: "confirmResult", cardId: lunch })).status, 403);
  const both = await Promise.all([host.act(roomId, { type: "confirmResult", cardId: lunch }), host.act(roomId, { type: "confirmResult", cardId: lunch })]);
  assert.deepEqual(both.map((r) => r.status).sort(), [200, 409]);
  s = (await alice.state(roomId)).data;
  assert.equal(s.cards[0].stage, "confirmed");
  assert.equal(s.cards[0].status, "confirmed");
  assert.ok(s.cards[0].result.confirmedAt);
});

// ── 동점 → 룰렛 ──
for (const c of [host, alice, bob]) await c.act(roomId, cond(dinner));
await addCand(host, dinner, cand("저녁 X", { tags: ["food"] }));
await addCand(alice, dinner, cand("저녁 Y", { tags: ["photo"] }));
s = (await host.state(roomId)).data;
const X = byName(s.cards[2], "저녁 X").id;
const Y = byName(s.cards[2], "저녁 Y").id;

await check("동점이면 동점 후보만 룰렛으로", async () => {
  await host.act(roomId, { type: "startDecision", cardId: dinner, mode: "vote" });
  await host.act(roomId, { type: "castVote", cardId: dinner, candidateId: X });
  await alice.act(roomId, { type: "castVote", cardId: dinner, candidateId: Y });
  await host.act(roomId, { type: "closeVote", cardId: dinner });
  s = (await bob.state(roomId)).data;
  assert.equal(s.cards[2].phase, "tie");
  assert.deepEqual([...s.cards[2].tieCandidateIds].sort(), [X, Y].sort());
  assert.equal((await bob.act(roomId, { type: "castVote", cardId: dinner, candidateId: X })).status, 409); // 마감 후 투표 불가
  await host.act(roomId, { type: "startTieRoulette", cardId: dinner });
  const spins = await Promise.all([host.act(roomId, { type: "spinRoulette", cardId: dinner }), host.act(roomId, { type: "spinRoulette", cardId: dinner })]);
  assert.ok(spins.some((r) => r.status === 200));
  s = (await alice.state(roomId)).data;
  const r = s.cards[2].result;
  assert.equal(r.detail.kind, "roulette");
  assert.equal(r.detail.fromTie, true);
  assert.ok([X, Y].includes(r.candidate.id));
  assert.equal(r.detail.pool[r.detail.winnerIndex].candidateId, r.candidate.id);
});

// ── 결정권 쟁탈전 ──
for (const c of [host, alice, bob]) await c.act(roomId, cond(activity, { restrictions: c === bob ? ["음주"] : [] }));
await addCand(alice, activity, cand("바다 산책", { cost: 0, tags: ["nature", "photo"], features: [] }));
await addCand(alice, activity, cand("보드게임 카페", { cost: 8000, tags: ["rest", "experience"], features: [] }));
await addCand(bob, activity, cand("야간 포차", { tags: ["food"], features: ["음주"] }));
s = (await host.state(roomId)).data;
const sea = byName(s.cards[1], "바다 산책").id;
const pub = byName(s.cards[1], "야간 포차").id;

await check("쟁탈전: 준비 → 카운트다운 중 입력 무시 → 연타 상한 → 종료 후 입력 무시", async () => {
  await host.act(roomId, { type: "startDecision", cardId: activity, mode: "battle" });
  assert.equal((await host.act(roomId, { type: "battleStart", cardId: activity })).status, 409); // 준비한 사람 없음
  await alice.act(roomId, { type: "battleReady", cardId: activity });
  await bob.act(roomId, { type: "battleReady", cardId: activity });
  assert.equal((await alice.act(roomId, { type: "battleStart", cardId: activity })).status, 403);
  assert.equal((await host.act(roomId, { type: "battleStart", cardId: activity })).status, 200);
  assert.equal((await host.act(roomId, { type: "battleTaps", cardId: activity, count: 5 })).status, 403); // 준비 안 한 사람

  await alice.act(roomId, { type: "battleTaps", cardId: activity, count: 50 }); // 카운트다운 중
  let me = (await alice.state(roomId)).data.cards[1].battle.find((b) => b.taps !== null);
  assert.equal(me.taps, 0);
  const bobView = (await bob.state(roomId)).data.cards[1].battle;
  assert.equal(bobView.filter((b) => b.taps !== null).length, 1); // 진행 중에는 내 횟수만 보임

  await sleep(3300);
  // 앨리스: 0.5초마다 5번씩 (초당 10회, 정상 속도)
  const aliceLoop = (async () => {
    for (let i = 0; i < 16; i++) {
      await alice.act(roomId, { type: "battleTaps", cardId: activity, count: 5 });
      await sleep(500);
    }
  })();
  // 밥: 1초 시점에 200번을 한꺼번에 보냄 → 상한으로 잘림
  await sleep(1000);
  await bob.act(roomId, { type: "battleTaps", cardId: activity, count: 200 });
  await aliceLoop;
  // 서버 기준 종료 + 유예 시간(3s 카운트다운 + 10s + 1.5s)이 지날 때까지 대기
  const running = (await host.state(roomId)).data;
  const finalizeAt = running.cards[1].phaseStartedAt + 3000 + 10000 + 1500;
  await sleep(Math.max(0, finalizeAt - running.serverNow) + 300);
  await bob.act(roomId, { type: "battleTaps", cardId: activity, count: 100 }); // 종료·유예 시간 이후 입력 → 무시

  s = (await host.state(roomId)).data;
  const card = s.cards[1];
  assert.equal(card.phase, "battle_picking");
  const aliceTaps = card.battle.find((b) => b.memberId === s.members.find((m) => m.nickname === "앨리스").id).taps;
  const bobTaps = card.battle.find((b) => b.memberId === s.members.find((m) => m.nickname === "밥").id).taps;
  console.log(`    (앨리스 ${aliceTaps}회, 밥 ${bobTaps}회)`);
  assert.ok(bobTaps <= 15, "몰아서 보낸 입력은 최근 1초 분량만 인정");
  assert.ok(aliceTaps >= 60 && aliceTaps <= 100);
  assert.equal(card.battleWinnerId, s.members.find((m) => m.nickname === "앨리스").id);
});

await check("우승자만 고를 수 있고, 충돌 후보는 우승자도 선택 불가", async () => {
  assert.equal((await bob.act(roomId, { type: "battlePick", cardId: activity, candidateId: sea })).status, 403);
  assert.equal((await alice.act(roomId, { type: "battlePick", cardId: activity, candidateId: pub })).status, 400);
  assert.equal((await alice.act(roomId, { type: "battlePick", cardId: activity, candidateId: sea })).status, 200);
  assert.equal((await alice.act(roomId, { type: "battlePick", cardId: activity, candidateId: sea })).status, 409);
  s = (await bob.state(roomId)).data;
  assert.equal(s.cards[1].result.candidate.name, "바다 산책");
  assert.equal(s.cards[1].result.detail.kind, "battle");
});

// ── 예외 ──
await check("통과 후보가 없으면 결정 시작 차단", async () => {
  const r = await host.act(roomId, { type: "startDecision", cardId: stay, mode: "roulette" });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "NO_ELIGIBLE");
});

await check("방장 잠금 → 수정 차단, 해제 후 가능", async () => {
  await host.act(roomId, { type: "setLock", cardId: stay, locked: true });
  assert.equal((await bob.act(roomId, cond(stay))).status, 409);
  await host.act(roomId, { type: "setLock", cardId: stay, locked: false });
  assert.equal((await bob.act(roomId, cond(stay))).status, 200);
});

await check("확정된 카드 다시 진행 → 라운드 증가, 결과 초기화", async () => {
  assert.equal((await host.act(roomId, { type: "resetDecision", cardId: lunch })).status, 200);
  s = (await host.state(roomId)).data;
  assert.equal(s.cards[0].stage, "open");
  assert.equal(s.cards[0].round, 2);
  assert.equal(s.cards[0].result, null);
});

await check("새로고침(재조회) 후에도 확정 결과 유지", async () => {
  await host.act(roomId, { type: "confirmResult", cardId: dinner });
  const again = (await bob.state(roomId)).data;
  assert.equal(again.cards[2].stage, "confirmed");
});

console.log(`\n${passed}개 검증 통과 (room ${roomId})`);
