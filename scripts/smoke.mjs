// 실행 중인 서버에 여러 참가자(쿠키 분리)로 접속해 전체 흐름과 예외 상황을 검증한다.
// 실행할 때마다 테스트 계정 4개와 모임 여러 개를 만든다. 그래서 보통은 이 파일을 직접 돌리지 않는다.
//   npm run smoke                              → 내장 DB(메모리)로 띄운 테스트 서버에서 실행 (공유 DB에 남지 않음)
//   BASE_URL=https://<배포주소> npm run smoke:url → 일부러 실제 서버·DB에 확인할 때만 (테스트 데이터가 남는다)

import assert from "node:assert/strict";

// npm run dev 서버는 .env.local의 공유 DB를 쓰므로, 주소를 직접 고른 실행이 아니면 막는다
const allowShared = process.argv.includes("--allow-shared-db");
if (!process.env.SMOKE_ISOLATED && !(allowShared && process.env.BASE_URL)) {
  console.error(
    "스모크 테스트는 `npm run smoke`로 실행해주세요 (공유 DB를 쓰지 않는 테스트 서버를 띄워요).\n" +
      "실제 서버·DB에 일부러 돌릴 때만: BASE_URL=<주소> npm run smoke:url  (테스트 계정·모임이 그 DB에 남아요)",
  );
  process.exit(1);
}

const BASE = process.env.BASE_URL;
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
      const value = pair.slice(i + 1);
      // 서버가 쿠키를 지우면(빈 값 / Max-Age=0) 브라우저처럼 삭제한다
      if (!value || /max-age=0/i.test(c)) this.cookies.delete(pair.slice(0, i));
      else this.cookies.set(pair.slice(0, i), value);
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
const cand = (name, patch = {}) => ({
  name,
  cost: 10000,
  tags: ["food"],
  link: "",
  description: "",
  ...patch,
});
// 의견 투표: 질문 저장 / 보기 이름으로 응답 만들기 (other: 기타 내용)
const saveQuestions = (cardId, questions) => ({ type: "saveQuestions", cardId, questions });
function answersFor(card, picks) {
  return Object.fromEntries(
    card.opinion.questions.map((q) => {
      const p = picks[q.title] ?? { labels: [q.options[0].label] };
      return [q.id, { optionIds: (p.labels ?? []).map((l) => q.options.find((o) => o.label === l).id), other: p.other ?? null }];
    }),
  );
}
const submitOpinion = (card, picks = {}) => ({ type: "submitOpinion", cardId: card.id, answers: answersFor(card, picks) });

const host = new Client("host");
const alice = new Client("alice");
const bob = new Client("bob");
const stranger = new Client("stranger"); // 로그인하지 않은 사람
const carol = new Client("carol"); // 로그인했지만 모임 참가자가 아닌 사람

console.log(`smoke test → ${BASE}`);

// 화면·모임 생성·참여는 로그인해야 쓸 수 있으므로 참가자들은 먼저 가입한다
const runId = Date.now().toString(36);
const PASSWORD = "password123";
for (const c of [host, alice, bob, carol]) {
  const r = await c.req("/api/auth/signup", { username: `s${runId}_${c.name}`, password: PASSWORD });
  assert.equal(r.status, 200, `${c.name} 가입 실패`);
}

await check("로그인하지 않으면 화면은 로그인 창으로, 모임 생성·참여 API는 401", async () => {
  for (const path of ["/", "/new", "/join/ABCDEF"]) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    assert.ok([302, 303, 307, 308].includes(res.status), `${path} → ${res.status}`);
    const location = new URL(res.headers.get("location"), BASE);
    assert.equal(location.pathname, "/login");
    if (path !== "/") assert.equal(location.searchParams.get("next"), path);
  }
  assert.equal((await fetch(BASE + "/login", { redirect: "manual" })).status, 200);
  const r = await stranger.req("/api/rooms", { name: "x", tripStart: "2026-11-07", tripEnd: null, cards: [{ title: "a", category: "meal" }], host: profile("a") });
  assert.equal(r.status, 401);
  assert.equal(r.data.code, "LOGIN_REQUIRED");
  assert.equal((await stranger.req("/api/demo", profile("a"))).status, 401);
});

await check("로그인한 상태로 로그인 창에 가면 원래 가려던 곳으로", async () => {
  const cookie = [...host.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(BASE + "/login?next=%2Fnew", { redirect: "manual", headers: { cookie } });
  assert.equal(new URL(res.headers.get("location"), BASE).pathname, "/new");
});

// ── 모임 생성·참여 ──
const created = await host.req("/api/rooms", {
  name: "스모크 테스트 여행",
  tripStart: "2026-11-07",
  tripEnd: "2026-11-08",
  cards: [
    { title: "점심 식사", category: "meal" },
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
  assert.ok(host.cookies.get(`edg_${created.data.roomId}`));
});

await check("잘못된 입력은 400 (종료일이 시작일보다 빠름)", async () => {
  const r = await host.req("/api/rooms", { name: "x", tripStart: "2026-11-08", tripEnd: "2026-11-01", cards: [{ title: "a", category: "meal" }], host: profile("a") });
  assert.equal(r.status, 400);
});

await check("결정 카드: 아이콘(장식)과 종류를 따로 저장, 종류가 없으면 아이콘 묶음으로", async () => {
  const base = { name: "아이콘 모임", tripStart: "2026-11-07", tripEnd: null, host: profile("아이콘") };
  assert.equal((await host.req("/api/rooms", { ...base, cards: [{ title: "카페", icon: "없는아이콘" }] })).status, 400);
  assert.equal((await host.req("/api/rooms", { ...base, cards: [{ title: "카페" }] })).status, 400); // 아이콘도 종류도 없음
  const r = await host.req("/api/rooms", {
    ...base,
    cards: [{ title: "카페 투어", icon: "coffee" }, { title: "캠핑장 놀이", icon: "tent", category: "activity", day: 1, time: "16:00" }],
  });
  assert.equal(r.status, 200);
  const cards = (await host.state(r.data.roomId)).data.cards;
  assert.deepEqual(cards.map((c) => [c.icon, c.category]), [["coffee", "meal"], ["tent", "activity"]]);
  assert.equal(cards[1].time, "16:00");
  assert.deepEqual(cards[0].opinion.questions, [], "새 카드는 질문 없이 시작 (앱이 질문을 정하지 않음)");
});

await check("모임을 만들 때 카드마다 의견 투표 질문을 정할 수 있고, 잘못된 질문은 거절", async () => {
  const base = { name: "질문 모임", tripStart: "2026-11-07", tripEnd: null, host: profile("질문") };
  const bad = await host.req("/api/rooms", {
    ...base,
    cards: [{ title: "점심", icon: "soup", category: "meal", questions: [{ title: "메뉴", multiple: false, options: ["한식", "기타"] }] }],
  });
  assert.equal(bad.status, 400);
  assert.match(bad.data.error, /‘점심’ 카드/);
  const r = await host.req("/api/rooms", {
    ...base,
    cards: [
      { title: "점심", icon: "soup", category: "meal", questions: [{ title: "예산", multiple: false, options: ["1만 원 이하", "2만 원 이하"] }] },
      { title: "숙소", icon: "hotel", category: "stay", questions: [{ title: "침대 개수", multiple: true, options: ["1개", "2개"] }] },
      { title: "카페", icon: "coffee", category: "meal" },
    ],
  });
  assert.equal(r.status, 200);
  const cards = (await host.state(r.data.roomId)).data.cards;
  assert.deepEqual(cards.map((c) => c.opinion.questions.map((q) => [q.title, q.multiple, q.options.map((o) => o.label)])), [
    [["예산", false, ["1만 원 이하", "2만 원 이하"]]],
    [["침대 개수", true, ["1개", "2개"]]],
    [],
  ]);
});

await check("유효하지 않은 초대 코드는 404", async () => {
  const r = await stranger.req("/api/invite/ZZZZZZ");
  assert.equal(r.status, 404);
});

await check("초대 코드로 참여 (로그인 필요)", async () => {
  assert.equal((await stranger.req(`/api/invite/${code}/join`, profile("손님"))).status, 401);
  const preview = await alice.req(`/api/invite/${code.toLowerCase()}`);
  assert.equal(preview.data.name, "스모크 테스트 여행");
  assert.equal((await alice.req(`/api/invite/${code}/join`, profile("앨리스", "rabbit"))).status, 200);
  assert.equal((await bob.req(`/api/invite/${code}/join`, profile("밥", "bird"))).status, 200);
});

await check("같은 닉네임은 거절", async () => {
  const r = await carol.req(`/api/invite/${code}/join`, profile("앨리스"));
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

// ── 의견 투표 ──
const cardOf = (view, id) => view.cards.find((c) => c.id === id);
const LUNCH_QUESTIONS = [
  { title: "예산", multiple: false, options: ["1만 원 이하", "2만 원 이하"] },
  { title: "피할 음식", multiple: true, options: ["날것", "해산물", "매운 음식"] },
];
const STAY_QUESTIONS = [
  { title: "1박 가격", multiple: false, options: ["10만 원 이하", "20만 원 이하"] },
  { title: "침대 개수", multiple: false, options: ["1개", "2개"] },
  { title: "수영장", multiple: false, options: ["필요", "없어도 됨"] },
];

await check("방장이 일정마다 다른 질문·보기를 직접 만든다 (응답 전에는 다시 고칠 수 있음)", async () => {
  assert.equal((await host.act(roomId, saveQuestions(lunch, [{ title: "임시", multiple: false, options: ["a", "b"] }]))).status, 200);
  assert.equal((await host.act(roomId, saveQuestions(lunch, LUNCH_QUESTIONS))).status, 200);
  assert.equal((await host.act(roomId, saveQuestions(stay, STAY_QUESTIONS))).status, 200);
  s = (await alice.state(roomId)).data;
  assert.deepEqual(cardOf(s, lunch).opinion.questions.map((q) => [q.title, q.multiple, q.options.map((o) => o.label)]), [
    ["예산", false, ["1만 원 이하", "2만 원 이하"]],
    ["피할 음식", true, ["날것", "해산물", "매운 음식"]],
  ]);
  assert.deepEqual(cardOf(s, stay).opinion.questions.map((q) => q.title), ["1박 가격", "침대 개수", "수영장"]);
  assert.deepEqual(cardOf(s, activity).opinion.questions, []);
});

await check("일반 참가자는 질문·보기를 바꿀 수 없음", async () => {
  const r = await alice.act(roomId, saveQuestions(lunch, [{ title: "내 질문", multiple: false, options: ["a", "b"] }]));
  assert.equal(r.status, 403);
  assert.equal((await bob.act(roomId, { type: "setCardIcon", cardId: lunch, icon: "coffee" })).status, 403);
});

await check("질문 검증: 빈 값·중복·기타 보기·보기 부족·과도한 길이와 개수는 서버가 거절", async () => {
  const bad = [
    [{ title: " ", multiple: false, options: ["a", "b"] }],
    [{ title: "예산", multiple: false, options: ["a", ""] }],
    [{ title: "예산", multiple: false, options: ["한식", "한식 "] }],
    [{ title: "예산", multiple: false, options: ["a", "b"] }, { title: "예산", multiple: true, options: ["c", "d"] }],
    [{ title: "메뉴", multiple: false, options: ["한식", "기타"] }],
    [{ title: "메뉴", multiple: false, options: ["한식"] }],
    [{ title: "가".repeat(31), multiple: false, options: ["a", "b"] }],
    [{ title: "메뉴", multiple: false, options: Array.from({ length: 11 }, (_, i) => `보기${i}`) }],
    Array.from({ length: 11 }, (_, i) => ({ title: `질문${i}`, multiple: false, options: ["a", "b"] })),
  ];
  for (const questions of bad) assert.equal((await host.act(roomId, saveQuestions(activity, questions))).status, 400, JSON.stringify(questions).slice(0, 60));
});

await check("아이콘을 바꿔도 질문·보기·종류는 그대로", async () => {
  const before = cardOf((await host.state(roomId)).data, lunch);
  assert.equal((await host.act(roomId, { type: "setCardIcon", cardId: lunch, icon: "coffee" })).status, 200);
  assert.equal((await host.act(roomId, { type: "setCardIcon", cardId: lunch, icon: "tent" })).status, 200);
  const after = cardOf((await host.state(roomId)).data, lunch);
  assert.equal(after.icon, "tent");
  assert.equal(after.category, before.category);
  assert.deepEqual(after.opinion.questions, before.opinion.questions);
});

await check("상태 API에 개별 조건·통과/충돌 평가가 없음", () => {
  const raw = JSON.stringify(s);
  assert.ok(!raw.includes('"conditions"'));
  assert.ok(!raw.includes('"evaluations"'));
});

await check("응답 검증: 단일 선택 2개·빈 기타·빠진 질문은 거절", async () => {
  const card = cardOf(s, lunch);
  assert.equal((await alice.act(roomId, submitOpinion(card, { 예산: { labels: ["1만 원 이하", "2만 원 이하"] } }))).status, 400);
  assert.equal((await alice.act(roomId, submitOpinion(card, { 예산: { labels: [], other: "   " } }))).status, 400);
  const answers = answersFor(card, {});
  delete answers[card.opinion.questions[1].id];
  assert.equal((await alice.act(roomId, { type: "submitOpinion", cardId: lunch, answers })).status, 400);
  assert.equal((await alice.state(roomId)).data.cards[0].opinion.submittedMemberIds.length, 0, "실패한 제출은 저장되지 않음");
});

await check("제출 전에는 집계를 받지 못하고, 후보 등록도 서버에서 거절", async () => {
  const card = cardOf((await bob.state(roomId)).data, lunch);
  assert.equal(card.opinion.results, null);
  assert.equal(card.opinion.myAnswers, null);
  const r = await bob.act(roomId, { type: "addCandidate", cardId: lunch, candidate: cand("먼저 올리기") });
  assert.equal(r.status, 403);
  assert.equal(r.data.code, "OPINION_REQUIRED");
});

await check("단일·복수 선택과 기타가 저장되고 새로고침 후에도 유지 (내 응답만 돌려받음)", async () => {
  const card = cardOf(s, lunch);
  const picks = { 예산: { labels: [], other: "1만 5천 원 정도면 좋겠어요" }, "피할 음식": { labels: ["날것", "해산물"], other: "고수" } };
  assert.equal((await alice.act(roomId, submitOpinion(card, picks))).status, 200);
  const again = cardOf((await alice.state(roomId)).data, lunch);
  assert.deepEqual(again.opinion.myAnswers, answersFor(card, picks));
});

await check("제출자는 정확한 보기별 인원·기타 의견을 보고, 다른 사람의 응답·신원은 연결되지 않음", async () => {
  const card = cardOf(s, lunch);
  assert.equal((await host.act(roomId, submitOpinion(card, { 예산: { labels: ["2만 원 이하"] }, "피할 음식": { labels: ["날것", "매운 음식"] } }))).status, 200);
  const view = (await host.state(roomId)).data;
  const op = cardOf(view, lunch).opinion;
  assert.equal(op.results.respondents, 2);
  const [budget, avoid] = op.results.questions;
  assert.deepEqual(budget.options.map((o) => o.count), [0, 1]);
  assert.equal(budget.otherCount, 1);
  assert.deepEqual(budget.otherTexts, ["1만 5천 원 정도면 좋겠어요"]);
  assert.deepEqual(avoid.options.map((o) => o.count), [2, 1, 1]); // 복수 선택: 합(4) > 응답자(2)
  assert.deepEqual(avoid.otherTexts, ["고수"]);
  // 응답자 식별 정보는 제출 여부 목록에만 있고, 집계·내 응답에는 다른 사람의 것이 없다
  const aliceId = view.members.find((m) => m.nickname === "앨리스").id;
  assert.ok(!JSON.stringify(op.results).includes(aliceId));
  assert.deepEqual(Object.keys(op), ["questions", "submittedMemberIds", "myAnswers", "results"]);
  assert.ok(!JSON.stringify(op.myAnswers).includes("1만 5천"), "남의 기타 의견은 내 응답에 섞이지 않음");
  assert.deepEqual([...op.submittedMemberIds].sort(), [aliceId, view.me.id].sort());
  // 아직 제출하지 않은 밥은 여전히 집계를 받지 못한다
  const bobRaw = JSON.stringify((await bob.state(roomId)).data);
  assert.ok(!bobRaw.includes("1만 5천") && !bobRaw.includes("고수"));
});

await check("응답이 하나라도 있으면 질문 구조가 잠김", async () => {
  const r = await host.act(roomId, saveQuestions(lunch, LUNCH_QUESTIONS));
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "QUESTIONS_LOCKED");
});

await check("중복 클릭·재요청·응답 수정은 집계를 늘리지 않고 갱신", async () => {
  const card = cardOf(s, lunch);
  const same = submitOpinion(card, { 예산: { labels: ["1만 원 이하"] }, "피할 음식": { labels: ["해산물"] } });
  const results = await Promise.all([1, 2, 3].map(() => bob.act(roomId, same)));
  assert.ok(results.every((r) => r.status === 200));
  let op = cardOf((await bob.state(roomId)).data, lunch).opinion;
  assert.equal(op.results.respondents, 3);
  assert.deepEqual(op.results.questions[0].options.map((o) => o.count), [1, 1]);
  // 앨리스가 응답을 수정: 기타 → 1만 원 이하, 피할 음식 → 매운 음식만
  assert.equal((await alice.act(roomId, submitOpinion(card, { 예산: { labels: ["1만 원 이하"] }, "피할 음식": { labels: ["매운 음식"] } }))).status, 200);
  op = cardOf((await bob.state(roomId)).data, lunch).opinion;
  assert.equal(op.results.respondents, 3);
  assert.deepEqual(op.results.questions[0].options.map((o) => o.count), [2, 1]);
  assert.equal(op.results.questions[0].otherCount, 0);
  assert.deepEqual(op.results.questions[0].otherTexts, []);
  assert.deepEqual(op.results.questions[1].options.map((o) => o.count), [1, 1, 2]);
  assert.equal(cardOf((await host.state(roomId)).data, lunch).status, "reviewing"); // 전원 제출
});

await check("다른 일정에 낸 의견은 이 일정의 제출을 대신하지 않음", async () => {
  const r = await alice.act(roomId, { type: "addCandidate", cardId: stay, candidate: cand("호텔") });
  assert.equal(r.status, 403);
  assert.equal(cardOf((await alice.state(roomId)).data, stay).opinion.results, null);
});

const addCand = async (client, cardId, c) => assert.equal((await client.act(roomId, { type: "addCandidate", cardId, candidate: c })).status, 200);
await addCand(alice, lunch, cand("식당 A", { cost: 12000, tags: ["food", "rest"] }));
await addCand(bob, lunch, cand("식당 B", { cost: 18000 }));
await addCand(bob, lunch, cand("식당 C", { cost: 10000 }));
await addCand(host, lunch, cand("식당 D", { cost: null, notes: { cost: "메뉴마다 달라요" } }));
await addCand(host, lunch, cand("식당 E", { cost: 9000, tags: ["shopping"] }));

s = (await host.state(roomId)).data;
const byName = (card, name) => card.candidates.find((c) => c.name === name);
const lunchCard = s.cards[0];

await check("제출자는 후보를 일정에 등록 (비용 ‘기타’ 내용 저장)", () => {
  assert.equal(lunchCard.candidates.length, 5);
  assert.equal(byName(lunchCard, "식당 D").notes.cost, "메뉴마다 달라요");
});

await check("다른 사람의 후보는 수정 불가 (방장은 가능)", async () => {
  const id = byName(lunchCard, "식당 B").id;
  assert.equal((await alice.act(roomId, { type: "deleteCandidate", candidateId: id })).status, 403);
  assert.equal((await host.act(roomId, { type: "updateCandidate", candidateId: id, candidate: cand("식당 B", { cost: 19000 }) })).status, 200);
});

// ── 다수결 ──
const A = byName(lunchCard, "식당 A").id;
const E = byName(lunchCard, "식당 E").id;
const B = byName(lunchCard, "식당 B").id;
const C = byName(lunchCard, "식당 C").id;
const D = byName(lunchCard, "식당 D").id;

await check("방장만 결정 시작, 모든 후보를 빼면 시작 불가", async () => {
  assert.equal((await alice.act(roomId, { type: "startDecision", cardId: lunch, mode: "vote" })).status, 403);
  const none = await host.act(roomId, { type: "startDecision", cardId: lunch, mode: "vote", excludeIds: [A, B, C, D, E] });
  assert.equal(none.status, 409);
  assert.equal(none.data.code, "NO_ELIGIBLE");
});

await check("등록된 후보가 모두 결정 대상이고, 방장이 뺀 후보만 제외", async () => {
  assert.equal((await host.act(roomId, { type: "startDecision", cardId: lunch, mode: "vote", excludeIds: [D] })).status, 200);
  s = (await host.state(roomId)).data;
  assert.deepEqual([...s.cards[0].pool].sort(), [A, B, C, E].sort());
});

await check("결정 중에는 후보·의견 수정 잠금", async () => {
  assert.equal((await bob.act(roomId, submitOpinion(cardOf(s, lunch), { 예산: { labels: ["2만 원 이하"] } }))).status, 409);
  assert.equal((await bob.act(roomId, { type: "addCandidate", cardId: lunch, candidate: cand("늦은 후보") })).status, 409);
});

await check("방장이 결정에서 뺀 후보에는 투표 불가", async () => {
  assert.equal((await bob.act(roomId, { type: "castVote", cardId: lunch, candidateId: D })).status, 400);
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
  assert.equal(c.result.candidate.name, "식당 A");
  assert.equal(c.result.detail.kind, "vote");
  assert.deepEqual(c.voting.counts.map((x) => x.votes), [2, 1, 0, 0]);
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
const SIMPLE_QUESTIONS = [{ title: "분위기", multiple: false, options: ["조용한 곳", "활기찬 곳"] }];
async function openOpinion(cardId) {
  assert.equal((await host.act(roomId, saveQuestions(cardId, SIMPLE_QUESTIONS))).status, 200);
  const card = cardOf((await host.state(roomId)).data, cardId);
  for (const c of [host, alice, bob]) assert.equal((await c.act(roomId, submitOpinion(card))).status, 200);
}
await openOpinion(dinner);
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

// ── 사다리 타기 ──
await openOpinion(activity);
await addCand(alice, activity, cand("바다 산책", { cost: 0, tags: ["nature", "photo"] }));
await addCand(alice, activity, cand("보드게임 카페", { cost: 8000, tags: ["rest", "experience"] }));
await addCand(bob, activity, cand("야간 포차", { tags: ["food"] }));
s = (await host.state(roomId)).data;
const sea = byName(s.cards[1], "바다 산책").id;
const pub = byName(s.cards[1], "야간 포차").id;

await check("사다리(후보 바로 정하기): 방장만, 동시에 눌러도 한 번만, 당첨 칸에 닿은 후보가 결과", async () => {
  assert.equal((await host.act(roomId, { type: "startDecision", cardId: activity, mode: "ladder", ladderTarget: "candidate" })).status, 200);
  let card = (await bob.state(roomId)).data.cards[1];
  assert.equal(card.phase, "ladder_ready");
  assert.deepEqual(card.ladder, { target: "candidate", run: null });
  assert.equal((await alice.act(roomId, { type: "runLadder", cardId: activity })).status, 403);
  const both = await Promise.all([host.act(roomId, { type: "runLadder", cardId: activity }), host.act(roomId, { type: "runLadder", cardId: activity })]);
  assert.ok(both.some((r) => r.status === 200));
  card = (await bob.state(roomId)).data.cards[1];
  assert.equal(card.phase, "result");
  const run = card.ladder.run;
  assert.equal(run.lanes.length, 3);
  assert.deepEqual(run.lanes.map((l) => l.id).sort(), [...card.pool].sort());
  assert.equal(card.result.detail.kind, "ladder");
  assert.deepEqual(card.result.detail.run, run, "결과에 같은 사다리가 저장됨");
  assert.equal(card.result.candidate.id, run.lanes[run.winnerLane].id);
  assert.equal((await host.act(roomId, { type: "runLadder", cardId: activity })).status, 409);
  assert.equal((await host.act(roomId, { type: "resetDecision", cardId: activity })).status, 200);
  assert.equal((await bob.state(roomId)).data.cards[1].ladder, null);
});

await check("사다리(결정권자 정하기): 당첨된 사람만 고르고, 결정 대상 밖 후보는 불가", async () => {
  assert.equal((await host.act(roomId, { type: "startDecision", cardId: activity, mode: "ladder", ladderTarget: "member" })).status, 200);
  assert.equal((await host.act(roomId, { type: "runLadder", cardId: activity })).status, 200);
  const card = (await host.state(roomId)).data.cards[1];
  assert.equal(card.phase, "ladder_picking");
  assert.equal(card.result, null);
  const run = card.ladder.run;
  assert.equal(run.lanes.length, 3, "참가자 3명이 사다리를 탐");
  const clients = [host, alice, bob];
  const ids = await Promise.all(clients.map(async (c) => (await c.state(roomId)).data.me.id));
  const decider = clients[ids.indexOf(run.lanes[run.winnerLane].id)];
  const other = clients.find((c) => c !== decider);
  assert.equal((await other.act(roomId, { type: "ladderPick", cardId: activity, candidateId: sea })).status, 403);
  assert.equal((await decider.act(roomId, { type: "ladderPick", cardId: activity, candidateId: X })).status, 400); // 다른 카드의 후보
  assert.ok(card.pool.includes(pub));
  assert.equal((await decider.act(roomId, { type: "ladderPick", cardId: activity, candidateId: sea })).status, 200);
  assert.equal((await decider.act(roomId, { type: "ladderPick", cardId: activity, candidateId: sea })).status, 409);
  s = (await bob.state(roomId)).data;
  assert.equal(s.cards[1].result.candidate.name, "바다 산책");
  assert.equal(s.cards[1].result.detail.kind, "ladder");
  assert.equal(s.cards[1].result.detail.target, "member");
});

// ── 예외 ──
await check("결정 대상 후보가 없으면 결정 시작 차단", async () => {
  const r = await host.act(roomId, { type: "startDecision", cardId: stay, mode: "roulette" });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "NO_ELIGIBLE");
});

await check("카드 일정(일차·시간): 방장만 수정, 형식 검사, 상태에 반영", async () => {
  assert.equal((await alice.act(roomId, { type: "setCardSchedule", cardId: stay, day: 1, time: "15:00" })).status, 403);
  assert.equal((await host.act(roomId, { type: "setCardSchedule", cardId: stay, day: 1, time: "25:00" })).status, 400);
  assert.equal((await host.act(roomId, { type: "setCardSchedule", cardId: stay, day: 2, time: "15:00" })).status, 200);
  const card = (await bob.state(roomId)).data.cards[3];
  assert.equal(card.day, 2);
  assert.equal(card.time, "15:00");
  assert.equal((await host.act(roomId, { type: "setCardSchedule", cardId: stay, day: null, time: null })).status, 200);
  assert.equal((await bob.state(roomId)).data.cards[3].time, null);
});

await check("방장 잠금 → 의견 제출 차단, 해제 후 가능", async () => {
  const stayCard = cardOf((await bob.state(roomId)).data, stay);
  await host.act(roomId, { type: "setLock", cardId: stay, locked: true });
  assert.equal((await bob.act(roomId, submitOpinion(stayCard))).status, 409);
  await host.act(roomId, { type: "setLock", cardId: stay, locked: false });
  assert.equal((await bob.act(roomId, submitOpinion(stayCard))).status, 200);
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

// ── 회원 계정 ──
const uname = `s${runId}_bob`;
const bobPhone = new Client("bob-phone");

await check("가입 형식 검사·중복 아이디 거절, 내 모임 목록에 참여한 모임 표시", async () => {
  assert.equal((await stranger.req("/api/auth/signup", { username: "a!", password: PASSWORD })).status, 400);
  assert.equal((await stranger.req("/api/auth/signup", { username: `s${runId}_new`, password: "short" })).status, 400);
  assert.equal((await stranger.req("/api/auth/signup", { username: uname.toUpperCase(), password: PASSWORD })).status, 409); // 대소문자 무시
  const me = (await bob.req("/api/auth/me")).data;
  assert.equal(me.user.username, uname);
  assert.ok(me.rooms.some((x) => x.id === roomId && x.nickname === "밥"));
});

await check("다른 기기에서 로그인하면 같은 참가자로 모임에 들어감 (기존 기기도 계속 사용)", async () => {
  assert.equal((await bobPhone.state(roomId)).status, 401);
  assert.equal((await bobPhone.req("/api/auth/login", { username: uname, password: "wrong-password" })).status, 401);
  assert.equal((await bobPhone.req("/api/auth/login", { username: "nobody_here", password: "password123" })).status, 401);
  assert.equal((await bobPhone.req("/api/auth/login", { username: uname, password: "password123" })).status, 200);
  const phoneView = await bobPhone.state(roomId);
  assert.equal(phoneView.status, 200);
  const bobView = await bob.state(roomId);
  assert.equal(bobView.status, 200);
  assert.equal(phoneView.data.me.id, bobView.data.me.id);
  assert.ok(!JSON.stringify(phoneView.data).includes("user_"), "상태 응답에 계정 id가 노출되지 않음");
});

await check("로그인한 상태로 만든 모임은 내 모임 목록에 바로 보임", async () => {
  const r = await bobPhone.req("/api/rooms", { name: "계정 모임", tripStart: "2026-12-01", tripEnd: null, cards: [{ title: "점심", category: "meal" }], host: profile("밥") });
  assert.equal(r.status, 200);
  const me = (await bobPhone.req("/api/auth/me")).data;
  assert.ok(me.rooms.some((x) => x.id === r.data.roomId && x.isHost));
});

await check("로그아웃하면 그 기기의 계정 연결 참여 권한도 사라지고, 다른 기기는 영향 없음", async () => {
  const phoneToken = bobPhone.cookies.get(`edg_${roomId}`);
  assert.equal((await bobPhone.req("/api/auth/logout", {})).status, 200);
  assert.equal((await bobPhone.req("/api/auth/me")).data.user, null);
  assert.equal((await bobPhone.state(roomId)).status, 401);
  bobPhone.cookies.set(`edg_${roomId}`, phoneToken); // 지워진 토큰을 다시 보내도 거절
  assert.equal((await bobPhone.state(roomId)).status, 401);
  assert.equal((await bob.state(roomId)).status, 200);
});

// ── 방장 넘기기 · 참가자 내보내기 ──
const memberIdOf = (view, nickname) => view.members.find((m) => m.nickname === nickname).id;

await check("방장 넘기기: 방장만, 자기 자신은 불가, 넘기면 권한이 옮겨감", async () => {
  s = (await host.state(roomId)).data;
  const aliceId = memberIdOf(s, "앨리스");
  assert.equal((await bob.act(roomId, { type: "transferHost", memberId: aliceId })).status, 403);
  assert.equal((await host.act(roomId, { type: "transferHost", memberId: s.me.id })).status, 400);
  assert.equal((await host.act(roomId, { type: "transferHost", memberId: aliceId })).status, 200);
  s = (await alice.state(roomId)).data;
  assert.equal(s.me.isHost, true);
  assert.equal(s.members.filter((m) => m.isHost).length, 1);
  assert.equal((await host.act(roomId, { type: "setLock", cardId: stay, locked: true })).status, 403); // 이제 일반 참가자
});

await check("내보내기: 결정 중에는 불가, 내보낸 참가자는 모임에 접근 불가", async () => {
  const bobId = memberIdOf(s, "밥");
  assert.equal((await host.act(roomId, { type: "kickMember", memberId: bobId })).status, 403); // 방장 아님
  assert.equal((await alice.act(roomId, { type: "kickMember", memberId: s.me.id })).status, 400); // 자기 자신
  await alice.act(roomId, { type: "startDecision", cardId: lunch, mode: "roulette" });
  const blocked = await alice.act(roomId, { type: "kickMember", memberId: bobId });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.data.code, "DECIDING");
  assert.equal((await alice.act(roomId, { type: "resetDecision", cardId: lunch })).status, 200);
  assert.equal((await alice.act(roomId, { type: "confirmResult", cardId: activity })).status, 200); // 사다리 결과 확정 대기도 결정 중
  assert.equal((await alice.act(roomId, { type: "kickMember", memberId: bobId })).status, 200);
  assert.equal((await bob.state(roomId)).status, 401);
  assert.ok(!(await bob.req("/api/auth/me")).data.rooms.some((x) => x.id === roomId));
  s = (await alice.state(roomId)).data;
  assert.ok(!s.members.some((m) => m.nickname === "밥"));
  assert.ok(s.cards[0].candidates.some((c) => c.name === "식당 B"), "내보낸 사람이 올린 후보는 남음");
  assert.ok(!s.cards[0].opinion.submittedMemberIds.includes(bobId), "내보낸 사람의 의견은 집계에서 빠짐");
  assert.equal(s.cards[0].opinion.results.respondents, 2);
});

// ── 구슬 레이스 ── (별도 모임: 방장=host, 참가자=carol)
const mr = (await host.req("/api/rooms", { name: "구슬 모임", tripStart: "2026-11-07", tripEnd: null, cards: [{ title: "점심", icon: "soup" }], host: profile("방장") })).data;
await carol.req(`/api/invite/${mr.inviteCode}/join`, profile("캐롤"));
let ms = (await host.state(mr.roomId)).data;
const mCard = ms.cards[0].id;
await host.act(mr.roomId, saveQuestions(mCard, SIMPLE_QUESTIONS));
await host.act(mr.roomId, submitOpinion(cardOf((await host.state(mr.roomId)).data, mCard)));
for (const name of ["국밥집", "분식집", "돈가스"]) assert.equal((await host.act(mr.roomId, { type: "addCandidate", cardId: mCard, candidate: cand(name) })).status, 200);

await check("구슬 레이스: 방장만 출발, 재생 중엔 결과를 숨기고 같은 기록을 받음", async () => {
  assert.equal((await host.act(mr.roomId, { type: "startDecision", cardId: mCard, mode: "marble" })).status, 200);
  assert.equal((await carol.act(mr.roomId, { type: "startMarble", cardId: mCard })).status, 403);
  const both = await Promise.all([host.act(mr.roomId, { type: "startMarble", cardId: mCard }), host.act(mr.roomId, { type: "startMarble", cardId: mCard })]);
  assert.ok(both.some((r) => r.status === 200));
  ms = (await carol.state(mr.roomId)).data;
  assert.equal(ms.cards[0].phase, "marble_running");
  assert.equal(ms.cards[0].result, null, "재생 중에는 결과를 보내지 않음");
  assert.ok(ms.cards[0].marble.endsAt > ms.cards[0].marble.startsAt);
  const a = await host.req(`/api/rooms/${mr.roomId}/marble/${mCard}`);
  const b = await carol.req(`/api/rooms/${mr.roomId}/marble/${mCard}`); // 도중에 들어온 사람도 같은 기록
  assert.equal(a.status, 200);
  assert.equal(JSON.stringify(a.data), JSON.stringify(b.data));
  assert.equal(a.data.race.names.length, 3);
  assert.equal((await stranger.req(`/api/rooms/${mr.roomId}/marble/${mCard}`)).status, 401);
  assert.equal((await host.act(mr.roomId, { type: "confirmResult", cardId: mCard })).status, 409); // 재생 중 확정 불가
});

await check("구슬 레이스: 재생이 끝나면 결과 공개, 늦게 들어온 사람은 기록 없이 결과만", async () => {
  const { endsAt } = ms.cards[0].marble;
  await sleep(Math.max(0, endsAt - ms.serverNow) + 500);
  const race = (await host.req(`/api/rooms/${mr.roomId}/marble/${mCard}`));
  assert.equal(race.status, 404);
  const done = (await carol.state(mr.roomId)).data.cards[0];
  assert.equal(done.phase, "result");
  assert.equal(done.result.detail.kind, "marble");
  assert.equal(done.result.detail.order.length, 3);
  assert.equal(done.result.candidate.id, done.result.detail.order[0].candidateId);
  assert.equal((await host.act(mr.roomId, { type: "confirmResult", cardId: mCard })).status, 200);
});

// ── 데모 모임 ──
await check("데모: 가상 참가자는 의견을 미리 제출, 방장은 직접 제출해야 집계·후보 등록 가능", async () => {
  const demo = await carol.req("/api/demo", profile("데모방장"));
  assert.equal(demo.status, 200);
  let dv = (await carol.state(demo.data.roomId)).data;
  assert.equal(dv.members.length, 4);
  const bots = dv.members.filter((m) => m.isBot).map((m) => m.id);
  assert.equal(bots.length, 3);
  for (const card of dv.cards) {
    assert.ok(card.opinion.questions.length > 0);
    assert.deepEqual([...card.opinion.submittedMemberIds].sort(), [...bots].sort());
    assert.equal(card.opinion.results, null);
  }
  assert.ok(dv.cards[0].candidates.length > 0, "가상 참가자가 올린 후보가 있음");
  const lunchDemo = dv.cards[0];
  assert.equal((await carol.act(demo.data.roomId, { type: "addCandidate", cardId: lunchDemo.id, candidate: cand("데모 후보") })).status, 403);
  assert.equal((await carol.act(demo.data.roomId, submitOpinion(lunchDemo))).status, 200);
  dv = (await carol.state(demo.data.roomId)).data;
  const results = dv.cards[0].opinion.results;
  assert.equal(results.respondents, 4);
  for (const botId of bots) assert.ok(!JSON.stringify(results).includes(botId));
  assert.equal((await carol.act(demo.data.roomId, { type: "addCandidate", cardId: lunchDemo.id, candidate: cand("데모 후보") })).status, 200);
  assert.equal((await carol.act(demo.data.roomId, { type: "startDecision", cardId: lunchDemo.id, mode: "roulette" })).status, 200);
  assert.equal((await carol.act(demo.data.roomId, { type: "spinRoulette", cardId: lunchDemo.id })).status, 200);
  assert.equal((await carol.act(demo.data.roomId, { type: "confirmResult", cardId: lunchDemo.id })).status, 200);
  assert.equal((await carol.state(demo.data.roomId)).data.cards[0].stage, "confirmed");
});

// ── 방 삭제 ── (구슬 모임: 방장=host, 참가자=carol)
await check("방 삭제: 방장만 가능, 삭제하면 남은 참가자도 모임에 접근 불가", async () => {
  assert.equal((await carol.act(mr.roomId, { type: "deleteRoom" })).status, 403);
  assert.equal((await host.act(mr.roomId, { type: "deleteRoom" })).status, 200);
  for (const who of [host, carol]) {
    const r = await who.state(mr.roomId);
    assert.equal(r.status, 404);
    assert.equal(r.data.code, "ROOM_NOT_FOUND");
  }
  assert.ok(!(await carol.req("/api/auth/me")).data.rooms.some((x) => x.id === mr.roomId));
  assert.equal((await host.act(mr.roomId, { type: "deleteRoom" })).status, 404);
});

console.log(`\n${passed}개 검증 통과 (room ${roomId})`);
