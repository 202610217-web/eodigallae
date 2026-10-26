import "server-only";
import { randomInt } from "node:crypto";
import {
  CARD_PRESETS,
  LIMITS,
  RESTRICTIONS,
  type CardCategory,
  type CharacterKey,
  type ColorKey,
  type DecisionMode,
  type SettingKey,
  type TasteKey,
  type VibeKey,
} from "@/lib/domain/constants";
import { battleWindow, acceptedTaps, pickUniform, rankBattle, tallyVotes } from "@/lib/domain/decide";
import { cardDisplayStatus, eligibleCandidateIds, evaluateCandidates } from "@/lib/domain/evaluate";
import type {
  BattleDetail,
  Candidate,
  CandidateEvaluation,
  CandidateSetting,
  CandidateSnapshot,
  CandidateVibe,
  CardPhase,
  CardStage,
  DecisionCardView,
  DecisionResult,
  Member,
  MemberCondition,
  ResultDetail,
  RoomView,
  TasteRanks,
} from "@/lib/domain/types";
import type { CandidateFields, RoomAction } from "@/lib/validation";
import { getDb, type Db, type Query, type Row } from "./db";
import { AppError } from "./errors";
import { hashToken, newId, newInviteCode, newToken } from "./session";

// ───────────────────────── 데이터 적재 ─────────────────────────

interface RoomRow {
  id: string;
  name: string;
  tripStart: string;
  tripEnd: string | null;
  inviteCode: string;
  isDemo: boolean;
}

interface CardRow {
  id: string;
  title: string;
  category: CardCategory;
  sortOrder: number;
  stage: CardStage;
  mode: DecisionMode | null;
  phase: CardPhase | null;
  round: number;
  locked: boolean;
  pool: string[];
  tieIds: string[];
  phaseStartedAt: number | null;
  battleWinnerId: string | null;
}

interface VoteRow {
  cardId: string;
  memberId: string;
  candidateId: string;
}

interface BattleRow {
  cardId: string;
  memberId: string;
  taps: number;
  lastAcceptedAt: number | null;
}

interface RoomData {
  room: RoomRow;
  members: Member[];
  cards: CardRow[];
  conditions: MemberCondition[];
  candidates: Candidate[];
  votes: VoteRow[];
  battle: BattleRow[];
  results: DecisionResult[];
  meId: string | null;
}

const str = (v: unknown) => String(v);
const num = (v: unknown) => Number(v);
const optNum = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const json = <T>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

function mapRoom(r: Row): RoomRow {
  return {
    id: str(r.id),
    name: str(r.name),
    tripStart: str(r.trip_start),
    tripEnd: r.trip_end === null ? null : str(r.trip_end),
    inviteCode: str(r.invite_code),
    isDemo: Boolean(r.is_demo),
  };
}

function mapMember(r: Row): Member {
  return {
    id: str(r.id),
    nickname: str(r.nickname),
    character: r.character as CharacterKey,
    color: r.color as ColorKey,
    isHost: Boolean(r.is_host),
    joinedAt: num(r.joined_at),
    taste: r.rank1 ? ([r.rank1, r.rank2, r.rank3] as TasteRanks) : null,
  };
}

function mapCard(r: Row): CardRow {
  return {
    id: str(r.id),
    title: str(r.title),
    category: r.category as CardCategory,
    sortOrder: num(r.sort_order),
    stage: r.stage as CardStage,
    mode: (r.mode as DecisionMode | null) ?? null,
    phase: (r.phase as CardPhase | null) ?? null,
    round: num(r.round),
    locked: Boolean(r.locked),
    pool: json<string[]>(r.pool),
    tieIds: json<string[]>(r.tie_ids),
    phaseStartedAt: optNum(r.phase_started_at),
    battleWinnerId: (r.battle_winner_id as string | null) ?? null,
  };
}

function mapCondition(r: Row): MemberCondition {
  return {
    memberId: str(r.member_id),
    cardId: str(r.card_id),
    maxBudget: optNum(r.max_budget),
    restrictions: json<string[]>(r.restrictions),
    setting: r.setting as SettingKey,
    vibe: r.vibe as VibeKey,
    wish: str(r.wish),
    note: str(r.note),
    ready: Boolean(r.ready),
    updatedAt: num(r.updated_at),
  };
}

function mapCandidate(r: Row): Candidate {
  return {
    id: str(r.id),
    cardId: str(r.card_id),
    createdBy: str(r.created_by),
    name: str(r.name),
    cost: optNum(r.cost),
    tags: json<TasteKey[]>(r.tags),
    features: r.features === null ? null : json<string[]>(r.features),
    setting: r.setting as CandidateSetting,
    vibe: r.vibe as CandidateVibe,
    link: str(r.link),
    description: str(r.description),
    createdAt: num(r.created_at),
  };
}

function mapResult(r: Row): DecisionResult {
  return {
    cardId: str(r.card_id),
    round: num(r.round),
    mode: r.mode as DecisionMode,
    candidate: json<CandidateSnapshot>(r.candidate),
    reasons: json<string[]>(r.reasons),
    detail: json<ResultDetail>(r.detail),
    createdAt: num(r.created_at),
    confirmedAt: optNum(r.confirmed_at),
  };
}

async function loadRoom(db: Db, roomId: string, token: string | null): Promise<RoomData> {
  const p = [roomId];
  const queries: Query[] = [
    { text: "SELECT * FROM rooms WHERE id = $1", params: p },
    {
      text: `SELECT m.*, t.rank1, t.rank2, t.rank3 FROM members m
             LEFT JOIN taste_preferences t ON t.member_id = m.id
             WHERE m.room_id = $1 ORDER BY m.joined_at`,
      params: p,
    },
    { text: "SELECT * FROM decision_cards WHERE room_id = $1 ORDER BY sort_order", params: p },
    { text: "SELECT * FROM member_conditions WHERE room_id = $1", params: p },
    { text: "SELECT * FROM candidates WHERE room_id = $1 ORDER BY created_at", params: p },
    {
      text: `SELECT v.card_id, v.member_id, v.candidate_id FROM votes v
             JOIN decision_cards c ON c.id = v.card_id AND c.round = v.round WHERE v.room_id = $1`,
      params: p,
    },
    {
      text: `SELECT b.card_id, b.member_id, b.taps, b.last_accepted_at FROM battle_entries b
             JOIN decision_cards c ON c.id = b.card_id AND c.round = b.round WHERE b.room_id = $1`,
      params: p,
    },
    {
      text: `SELECT r.* FROM decision_results r
             JOIN decision_cards c ON c.id = r.card_id AND c.round = r.round WHERE r.room_id = $1`,
      params: p,
    },
    {
      text: "SELECT id FROM members WHERE room_id = $1 AND token_hash = $2",
      params: [roomId, token ? hashToken(token) : "-"],
    },
  ];
  const [rooms, members, cards, conditions, candidates, votes, battle, results, me] = await db.batch(queries);
  if (rooms.length === 0) throw new AppError(404, "모임을 찾을 수 없어요. 초대 링크를 다시 확인해주세요.", "ROOM_NOT_FOUND");
  return {
    room: mapRoom(rooms[0]),
    members: members.map(mapMember),
    cards: cards.map(mapCard),
    conditions: conditions.map(mapCondition),
    candidates: candidates.map(mapCandidate),
    votes: votes.map((r) => ({ cardId: str(r.card_id), memberId: str(r.member_id), candidateId: str(r.candidate_id) })),
    battle: battle.map((r) => ({
      cardId: str(r.card_id),
      memberId: str(r.member_id),
      taps: num(r.taps),
      lastAcceptedAt: optNum(r.last_accepted_at),
    })),
    results: results.map(mapResult),
    meId: me[0] ? str(me[0].id) : null,
  };
}

// ───────────────────────── 계산 헬퍼 ─────────────────────────

function evaluateCard(data: RoomData, card: CardRow): CandidateEvaluation[] {
  return evaluateCandidates({
    category: card.category,
    members: data.members,
    conditions: data.conditions.filter((c) => c.cardId === card.id),
    candidates: data.candidates.filter((c) => c.cardId === card.id),
  });
}

function snapshot(c: Candidate): CandidateSnapshot {
  return { id: c.id, name: c.name, cost: c.cost, tags: c.tags, description: c.description, link: c.link };
}

function goodReasons(evaluations: CandidateEvaluation[], candidateId: string): string[] {
  const e = evaluations.find((x) => x.candidateId === candidateId);
  return e ? e.reasons.filter((r) => r.tone === "good").map((r) => r.text) : [];
}

const secureRandom = (n: number) => randomInt(n);

// ───────────────────────── 뷰 생성 ─────────────────────────

function buildView(data: RoomData, now: number, storage: Db["kind"]): RoomView {
  const me = data.members.find((m) => m.id === data.meId);
  if (!me) throw new AppError(401, "이 모임의 참가자가 아니에요. 초대 링크로 먼저 참여해주세요.", "NOT_MEMBER");

  const cards: DecisionCardView[] = data.cards.map((card) => {
    const conditions = data.conditions.filter((c) => c.cardId === card.id);
    const candidates = data.candidates.filter((c) => c.cardId === card.id);
    const votes = data.votes.filter((v) => v.cardId === card.id);
    const entries = data.battle.filter((b) => b.cardId === card.id);
    const battleRevealed = card.phase !== "battle_lobby" && card.phase !== "battle_running";

    return {
      id: card.id,
      title: card.title,
      category: card.category,
      sortOrder: card.sortOrder,
      stage: card.stage,
      status: cardDisplayStatus(card.stage, data.members, conditions),
      mode: card.mode,
      phase: card.phase,
      round: card.round,
      locked: card.locked,
      pool: card.pool,
      tieCandidateIds: card.tieIds,
      phaseStartedAt: card.phaseStartedAt,
      battleWinnerId: card.battleWinnerId,
      conditions,
      candidates,
      evaluations: evaluateCard(data, card),
      voting:
        card.mode === "vote"
          ? {
              votedCount: votes.length,
              eligibleVoters: data.members.length,
              myVoteCandidateId: votes.find((v) => v.memberId === me.id)?.candidateId ?? null,
              // 투표가 끝나기 전에는 후보별 득표수를 보내지 않는다
              counts: card.phase === "voting" || card.phase === "tallying" ? null : tallyVotes(votes, card.pool).counts,
            }
          : null,
      battle:
        card.mode === "battle"
          ? entries.map((b) => ({
              memberId: b.memberId,
              ready: true,
              taps: battleRevealed || b.memberId === me.id ? b.taps : null,
            }))
          : [],
      result: data.results.find((r) => r.cardId === card.id) ?? null,
    };
  });

  return {
    id: data.room.id,
    name: data.room.name,
    tripStart: data.room.tripStart,
    tripEnd: data.room.tripEnd,
    inviteCode: data.room.inviteCode,
    isDemo: data.room.isDemo,
    me,
    members: data.members,
    cards,
    serverNow: now,
    storage,
  };
}

/** 시간 경과로 넘어가야 하는 단계(쟁탈전 종료)를 처리한다. 조건부 UPDATE라 여러 요청이 동시에 와도 한 번만 반영된다. */
async function advanceTimers(db: Db, data: RoomData, now: number): Promise<boolean> {
  let changed = false;
  for (const card of data.cards) {
    if (card.phase !== "battle_running" || card.phaseStartedAt === null) continue;
    if (now < battleWindow(card.phaseStartedAt).finalizeAt) continue;
    const entries = data.battle.filter((b) => b.cardId === card.id);
    const { winnerId } = rankBattle(entries, secureRandom);
    const rows = await db.query(
      `UPDATE decision_cards SET phase = 'battle_picking', battle_winner_id = $1, updated_at = $2
       WHERE id = $3 AND phase = 'battle_running' AND round = $4 RETURNING id`,
      [winnerId, now, card.id, card.round],
    );
    if (rows.length > 0) changed = true;
  }
  return changed;
}

export async function getRoomView(roomId: string, token: string | null): Promise<RoomView> {
  const db = await getDb();
  const now = Date.now();
  let data = await loadRoom(db, roomId, token);
  if (!data.meId) throw new AppError(401, "이 모임의 참가자가 아니에요. 초대 링크로 먼저 참여해주세요.", "NOT_MEMBER");
  if (await advanceTimers(db, data, now)) data = await loadRoom(db, roomId, token);
  return buildView(data, now, db.kind);
}

// ───────────────────────── 모임 생성·참여 ─────────────────────────

interface Profile {
  nickname: string;
  character: CharacterKey;
  color: ColorKey;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23505";
}

export async function createRoom(input: {
  name: string;
  tripStart: string;
  tripEnd: string | null;
  cards: { title: string; category: CardCategory }[];
  host: Profile;
  isDemo?: boolean;
}): Promise<{ roomId: string; token: string; memberId: string; inviteCode: string }> {
  const db = await getDb();
  const now = Date.now();
  const roomId = newId("room");
  const memberId = newId("mem");
  const token = newToken();

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = newInviteCode();
    try {
      await db.batch([
        {
          text: `INSERT INTO rooms (id, name, trip_start, trip_end, invite_code, is_demo, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          params: [roomId, input.name, input.tripStart, input.tripEnd, inviteCode, input.isDemo ?? false, now],
        },
        {
          text: `INSERT INTO members (id, room_id, nickname, character, color, is_host, token_hash, joined_at)
                 VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
          params: [memberId, roomId, input.host.nickname, input.host.character, input.host.color, hashToken(token), now],
        },
        ...input.cards.map((c, i) => ({
          text: `INSERT INTO decision_cards (id, room_id, title, category, sort_order, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
          params: [newId("card"), roomId, c.title, c.category, i, now],
        })),
      ]);
      return { roomId, token, memberId, inviteCode };
    } catch (err) {
      // 초대 코드가 우연히 겹친 경우만 재시도
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new AppError(500, "초대 코드를 만들지 못했어요. 다시 시도해주세요.");
}

export async function getInvitePreview(code: string) {
  const db = await getDb();
  const rooms = await db.query("SELECT id, name, trip_start, trip_end FROM rooms WHERE invite_code = $1", [code]);
  if (rooms.length === 0) throw new AppError(404, "유효하지 않은 초대 코드예요. 코드를 다시 확인해주세요.", "INVALID_CODE");
  const room = rooms[0];
  const members = await db.query(
    "SELECT nickname, character, color, is_host FROM members WHERE room_id = $1 ORDER BY joined_at",
    [room.id],
  );
  return {
    roomId: str(room.id),
    name: str(room.name),
    tripStart: str(room.trip_start),
    tripEnd: room.trip_end === null ? null : str(room.trip_end),
    members: members.map((m) => ({
      nickname: str(m.nickname),
      character: m.character as CharacterKey,
      color: m.color as ColorKey,
      isHost: Boolean(m.is_host),
    })),
  };
}

export async function isMemberOf(roomId: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const db = await getDb();
  const rows = await db.query("SELECT 1 FROM members WHERE room_id = $1 AND token_hash = $2", [roomId, hashToken(token)]);
  return rows.length > 0;
}

export async function joinRoom(code: string, profile: Profile) {
  const db = await getDb();
  const rooms = await db.query("SELECT id FROM rooms WHERE invite_code = $1", [code]);
  if (rooms.length === 0) throw new AppError(404, "유효하지 않은 초대 코드예요. 코드를 다시 확인해주세요.", "INVALID_CODE");
  const roomId = str(rooms[0].id);
  const members = await db.query("SELECT nickname FROM members WHERE room_id = $1", [roomId]);
  if (members.length >= LIMITS.maxMembers) throw new AppError(409, `한 모임에는 최대 ${LIMITS.maxMembers}명까지 참여할 수 있어요.`);
  if (members.some((m) => m.nickname === profile.nickname)) {
    throw new AppError(409, "이미 같은 닉네임을 쓰는 참가자가 있어요. 다른 닉네임을 골라주세요.");
  }
  const memberId = newId("mem");
  const token = newToken();
  try {
    await db.query(
      `INSERT INTO members (id, room_id, nickname, character, color, is_host, token_hash, joined_at)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7)`,
      [memberId, roomId, profile.nickname, profile.character, profile.color, hashToken(token), Date.now()],
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "이미 같은 닉네임을 쓰는 참가자가 있어요. 다른 닉네임을 골라주세요.");
    throw err;
  }
  return { roomId, token, memberId };
}

// ───────────────────────── 데모 모임 ─────────────────────────

const DEMO_BOTS: { nickname: string; character: CharacterKey; color: ColorKey; taste: TasteRanks; budget: number | null; restrictions: Record<CardCategory, string[]> }[] = [
  { nickname: "민지", character: "rabbit", color: "sky", taste: ["food", "photo", "nature"], budget: 30000, restrictions: { meal: ["날것(회·육회)"], activity: [], stay: [] } },
  { nickname: "준호", character: "dog", color: "mint", taste: ["rest", "food", "shopping"], budget: 25000, restrictions: { meal: [], activity: ["물놀이·수상 활동"], stay: ["공용 욕실"] } },
  { nickname: "서연", character: "bird", color: "violet", taste: ["nature", "photo", "culture"], budget: null, restrictions: { meal: ["매운 음식"], activity: [], stay: [] } },
];

type DemoCandidate = Omit<CandidateFields, "link" | "description"> & { description: string };
const DEMO_CANDIDATES: Record<string, DemoCandidate[]> = {
  lunch: [
    { name: "항구 앞 생선구이 정식", cost: 15000, tags: ["food"], features: ["해산물"], setting: "indoor", vibe: "lively", description: "점심 특선 정식, 웨이팅 20분 정도" },
    { name: "시장 물회 골목", cost: 18000, tags: ["food", "shopping"], features: ["해산물", "날것(회·육회)", "매운 음식"], setting: "indoor", vibe: "lively", description: "시장 구경 겸 물회" },
    { name: "오션뷰 브런치 카페", cost: null, tags: ["photo", "rest"], features: ["유제품", "밀가루"], setting: "indoor", vibe: "quiet", description: "가격 정보는 아직 확인 못 했어요" },
  ],
  activity: [
    { name: "바다 산책", cost: 0, tags: ["nature", "photo"], features: ["등산·오래 걷기"], setting: "outdoor", vibe: "quiet", description: "해안 산책로 4km" },
    { name: "보드게임 카페", cost: 8000, tags: ["rest", "experience"], features: [], setting: "indoor", vibe: "lively", description: "2시간 이용권" },
    { name: "시장 투어", cost: 15000, tags: ["food", "shopping"], features: [], setting: "both", vibe: "lively", description: "간식 사 먹으며 구경" },
    { name: "투명 카약 체험", cost: 35000, tags: ["experience", "nature", "photo"], features: ["물놀이·수상 활동"], setting: "outdoor", vibe: "lively", description: "1시간 코스" },
  ],
  dinner: [
    { name: "흑돼지 구이", cost: 28000, tags: ["food"], features: ["돼지고기"], setting: "indoor", vibe: "lively", description: "" },
    { name: "로컬 파스타 비스트로", cost: 22000, tags: ["food", "photo"], features: ["밀가루", "유제품"], setting: "indoor", vibe: "quiet", description: "" },
  ],
};

export async function createDemoRoom(host: Profile) {
  const created = await createRoom({
    name: "부산 1박 2일 (데모)",
    tripStart: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    tripEnd: new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10),
    cards: CARD_PRESETS.map((p) => ({ title: p.title, category: p.category })),
    host,
    isDemo: true,
  });
  const db = await getDb();
  const now = Date.now();
  const cards = (await db.query("SELECT id, category, sort_order FROM decision_cards WHERE room_id = $1 ORDER BY sort_order", [created.roomId])).map(
    (r) => ({ id: str(r.id), category: r.category as CardCategory, preset: CARD_PRESETS[num(r.sort_order)]?.key ?? "" }),
  );
  const queries: Query[] = [];
  DEMO_BOTS.forEach((bot, i) => {
    const botId = newId("mem");
    queries.push(
      {
        text: `INSERT INTO members (id, room_id, nickname, character, color, is_host, token_hash, joined_at)
               VALUES ($1, $2, $3, $4, $5, false, NULL, $6)`,
        params: [botId, created.roomId, bot.nickname, bot.character, bot.color, now + i + 1],
      },
      {
        text: `INSERT INTO taste_preferences (member_id, room_id, rank1, rank2, rank3, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        params: [botId, created.roomId, ...bot.taste, now],
      },
      ...cards.map((card) => ({
        text: `INSERT INTO member_conditions (card_id, member_id, room_id, max_budget, restrictions, setting, vibe, wish, note, ready, updated_at)
               VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'any', '', '', true, $7)`,
        params: [
          card.id,
          botId,
          created.roomId,
          card.category === "stay" ? (bot.budget ? 70000 : null) : bot.budget,
          JSON.stringify(bot.restrictions[card.category]),
          i === 0 ? "indoor" : "any",
          now,
        ],
      })),
    );
    for (const card of cards) {
      for (const [j, c] of (DEMO_CANDIDATES[card.preset] ?? []).entries()) {
        if (j % DEMO_BOTS.length !== i) continue;
        queries.push({
          text: `INSERT INTO candidates (id, card_id, room_id, created_by, name, cost, tags, features, setting, vibe, link, description, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, '', $11, $12, $12)`,
          params: [newId("cand"), card.id, created.roomId, botId, c.name, c.cost, JSON.stringify(c.tags), c.features === null ? null : JSON.stringify(c.features), c.setting, c.vibe, c.description, now + j],
        });
      }
    }
  });
  await db.batch(queries);
  return created;
}

// ───────────────────────── 액션 처리 ─────────────────────────

function requireCard(data: RoomData, cardId: string): CardRow {
  const card = data.cards.find((c) => c.id === cardId);
  if (!card) throw new AppError(404, "결정 카드를 찾을 수 없어요.");
  return card;
}

function requireHost(me: Member) {
  if (!me.isHost) throw new AppError(403, "방장만 할 수 있는 작업이에요.");
}

function requireEditable(card: CardRow) {
  if (card.stage === "confirmed") throw new AppError(409, "이미 확정된 카드예요. 방장이 다시 진행하면 수정할 수 있어요.");
  if (card.stage === "deciding") throw new AppError(409, "결정이 진행 중이라 수정할 수 없어요. 방장이 결정을 취소하면 수정할 수 있어요.");
  if (card.locked) throw new AppError(409, "방장이 이 카드를 잠갔어요. 잠금을 풀면 수정할 수 있어요.");
}

function requirePhase(card: CardRow, phase: CardPhase, message: string) {
  if (card.phase !== phase) throw new AppError(409, message);
}

function validateOptions(category: CardCategory, values: string[]) {
  const allowed = RESTRICTIONS[category].options;
  const bad = values.find((v) => !allowed.includes(v));
  if (bad) throw new AppError(400, `선택할 수 없는 항목이에요: ${bad}`);
}

function candidateParams(c: CandidateFields) {
  return [c.name, c.cost, JSON.stringify(c.tags), c.features === null ? null : JSON.stringify(c.features), c.setting, c.vibe, c.link, c.description];
}

async function insertResult(
  db: Db,
  card: CardRow,
  args: { candidate: Candidate; mode: DecisionMode; reasons: string[]; detail: ResultDetail; requiredPhase: CardPhase },
  now: number,
): Promise<boolean> {
  const rows = await db.query(
    `INSERT INTO decision_results (card_id, round, room_id, mode, candidate, reasons, detail, created_at)
     SELECT $1, $2, room_id, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7 FROM decision_cards
     WHERE id = $1 AND round = $2 AND phase = $8
     ON CONFLICT (card_id, round) DO NOTHING RETURNING card_id`,
    [card.id, card.round, args.mode, JSON.stringify(snapshot(args.candidate)), JSON.stringify(args.reasons), JSON.stringify(args.detail), now, args.requiredPhase],
  );
  if (rows.length === 0) return false;
  await db.query(
    `UPDATE decision_cards SET phase = 'result', updated_at = $1 WHERE id = $2 AND round = $3 AND phase = $4`,
    [now, card.id, card.round, args.requiredPhase],
  );
  return true;
}

/** 투표 마감. 'tallying'으로 먼저 전환해 마감 이후 들어오는 표를 막고, 전환에 성공한 요청만 집계한다. */
async function closeVoting(db: Db, roomId: string, card: CardRow, token: string, now: number) {
  const claimed = await db.query(
    `UPDATE decision_cards SET phase = 'tallying', updated_at = $1 WHERE id = $2 AND round = $3 AND phase = 'voting' RETURNING id`,
    [now, card.id, card.round],
  );
  if (claimed.length === 0) return;
  const data = await loadRoom(db, roomId, token);
  const fresh = requireCard(data, card.id);
  const votes = data.votes.filter((v) => v.cardId === card.id);
  const tally = tallyVotes(votes, fresh.pool);
  if (tally.isTie) {
    await db.query(`UPDATE decision_cards SET phase = 'tie', tie_ids = $1::jsonb, updated_at = $2 WHERE id = $3 AND phase = 'tallying'`, [
      JSON.stringify(tally.winners),
      now,
      card.id,
    ]);
    return;
  }
  const candidate = data.candidates.find((c) => c.id === tally.winners[0]);
  if (!candidate) throw new AppError(409, "당첨 후보를 찾을 수 없어요. 방장이 결정을 다시 진행해주세요.");
  const top = tally.counts[0].votes;
  const names = new Map(data.candidates.map((c) => [c.id, c.name]));
  await insertResult(
    db,
    fresh,
    {
      candidate,
      mode: "vote",
      reasons: [`${votes.length}명 투표 중 ${top}표로 최다 득표`, ...goodReasons(evaluateCard(data, fresh), candidate.id)],
      detail: {
        kind: "vote",
        counts: tally.counts.map((c) => ({ ...c, name: names.get(c.candidateId) ?? "삭제된 후보" })),
        totalVoters: votes.length,
      },
      requiredPhase: "tallying",
    },
    now,
  );
}

export async function performAction(roomId: string, token: string | null, action: RoomAction): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  let data = await loadRoom(db, roomId, token);
  if (!data.meId || !token) throw new AppError(401, "이 모임의 참가자가 아니에요. 초대 링크로 먼저 참여해주세요.", "NOT_MEMBER");
  if (await advanceTimers(db, data, now)) data = await loadRoom(db, roomId, token);
  const me = data.members.find((m) => m.id === data.meId)!;

  switch (action.type) {
    case "setTaste": {
      await db.query(
        `INSERT INTO taste_preferences (member_id, room_id, rank1, rank2, rank3, updated_at) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (member_id) DO UPDATE SET rank1 = $3, rank2 = $4, rank3 = $5, updated_at = $6`,
        [me.id, roomId, ...action.ranks, now],
      );
      return;
    }

    case "saveCondition": {
      const c = action.condition;
      const card = requireCard(data, c.cardId);
      requireEditable(card);
      validateOptions(card.category, c.restrictions);
      await db.query(
        `INSERT INTO member_conditions (card_id, member_id, room_id, max_budget, restrictions, setting, vibe, wish, note, ready, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (card_id, member_id) DO UPDATE SET max_budget = $4, restrictions = $5::jsonb, setting = $6, vibe = $7,
           wish = $8, note = $9, ready = $10, updated_at = $11`,
        [card.id, me.id, roomId, c.maxBudget, JSON.stringify([...new Set(c.restrictions)]), c.setting, c.vibe, c.wish, c.note, c.ready, now],
      );
      return;
    }

    case "setConditionReady": {
      const card = requireCard(data, action.cardId);
      requireEditable(card);
      const rows = await db.query(
        `UPDATE member_conditions SET ready = $1, updated_at = $2 WHERE card_id = $3 AND member_id = $4 RETURNING card_id`,
        [action.ready, now, card.id, me.id],
      );
      if (rows.length === 0) throw new AppError(400, "먼저 조건을 저장해주세요.");
      return;
    }

    case "addCandidate": {
      const card = requireCard(data, action.cardId);
      requireEditable(card);
      if (action.candidate.features) validateOptions(card.category, action.candidate.features);
      if (data.candidates.filter((c) => c.cardId === card.id).length >= LIMITS.maxCandidates) {
        throw new AppError(409, `후보는 카드당 ${LIMITS.maxCandidates}개까지 등록할 수 있어요.`);
      }
      await db.query(
        `INSERT INTO candidates (id, card_id, room_id, created_by, name, cost, tags, features, setting, vibe, link, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $13)`,
        [newId("cand"), card.id, roomId, me.id, ...candidateParams(action.candidate), now],
      );
      return;
    }

    case "updateCandidate":
    case "deleteCandidate": {
      const cand = data.candidates.find((c) => c.id === action.candidateId);
      if (!cand) throw new AppError(404, "후보를 찾을 수 없어요. 이미 삭제됐을 수 있어요.");
      if (cand.createdBy !== me.id && !me.isHost) throw new AppError(403, "후보를 등록한 사람이나 방장만 수정할 수 있어요.");
      const card = requireCard(data, cand.cardId);
      requireEditable(card);
      if (action.type === "deleteCandidate") {
        await db.query("DELETE FROM candidates WHERE id = $1", [cand.id]);
        return;
      }
      if (action.candidate.features) validateOptions(card.category, action.candidate.features);
      await db.query(
        `UPDATE candidates SET name = $1, cost = $2, tags = $3::jsonb, features = $4::jsonb, setting = $5, vibe = $6, link = $7,
           description = $8, updated_at = $9 WHERE id = $10`,
        [...candidateParams(action.candidate), now, cand.id],
      );
      return;
    }

    case "startDecision": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      if (card.stage !== "open") throw new AppError(409, "이미 결정이 진행 중이거나 확정된 카드예요.");
      const eligible = eligibleCandidateIds(evaluateCard(data, card));
      if (eligible.length === 0) {
        throw new AppError(409, "결정할 수 있는 후보가 없어요. 확인 필요 후보의 정보를 채우거나 후보를 추가해주세요.", "NO_ELIGIBLE");
      }
      const phase: CardPhase = action.mode === "vote" ? "voting" : action.mode === "roulette" ? "roulette_ready" : "battle_lobby";
      const rows = await db.query(
        `UPDATE decision_cards SET stage = 'deciding', mode = $1, phase = $2, pool = $3::jsonb, tie_ids = '[]'::jsonb,
           phase_started_at = $4, battle_winner_id = NULL, updated_at = $4
         WHERE id = $5 AND stage = 'open' AND round = $6 RETURNING id`,
        [action.mode, phase, JSON.stringify(eligible), now, card.id, card.round],
      );
      if (rows.length === 0) throw new AppError(409, "다른 사람이 먼저 결정을 시작했어요.");
      return;
    }

    case "castVote": {
      const card = requireCard(data, action.cardId);
      requirePhase(card, "voting", "투표가 진행 중이 아니에요.");
      if (!card.pool.includes(action.candidateId)) {
        throw new AppError(400, "결정 대상 후보에만 투표할 수 있어요.");
      }
      const rows = await db.query(
        `INSERT INTO votes (card_id, member_id, round, room_id, candidate_id, created_at)
         SELECT $1, $2, $3, $4, $5, $6 WHERE EXISTS (
           SELECT 1 FROM decision_cards WHERE id = $1 AND round = $3 AND phase = 'voting')
         ON CONFLICT (card_id, member_id, round) DO NOTHING RETURNING member_id`,
        [card.id, me.id, card.round, roomId, action.candidateId, now],
      );
      if (rows.length === 0) {
        const already = data.votes.some((v) => v.cardId === card.id && v.memberId === me.id);
        throw new AppError(409, already ? "이미 투표했어요. 투표는 한 번만 할 수 있어요." : "투표가 이미 마감됐어요.", "ALREADY_VOTED");
      }
      const count = await db.query("SELECT count(*)::int AS n FROM votes WHERE card_id = $1 AND round = $2", [card.id, card.round]);
      if (num(count[0].n) >= data.members.length) await closeVoting(db, roomId, card, token, now);
      return;
    }

    case "closeVote": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      requirePhase(card, "voting", "투표가 진행 중이 아니에요.");
      await closeVoting(db, roomId, card, token, now);
      return;
    }

    case "startTieRoulette": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      requirePhase(card, "tie", "동점 상황이 아니에요.");
      await db.query(`UPDATE decision_cards SET phase = 'roulette_ready', updated_at = $1 WHERE id = $2 AND phase = 'tie' AND round = $3`, [
        now,
        card.id,
        card.round,
      ]);
      return;
    }

    case "spinRoulette": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      requirePhase(card, "roulette_ready", "룰렛을 돌릴 수 있는 단계가 아니에요.");
      const evaluations = evaluateCard(data, card);
      const eligible = new Set(eligibleCandidateIds(evaluations));
      const fromTie = card.tieIds.length > 0;
      // 결과를 먼저 정하고, 화면의 회전은 이 결과를 보여주기만 한다
      const poolIds = (fromTie ? card.tieIds : card.pool).filter((id) => eligible.has(id));
      const pool = poolIds.map((id) => data.candidates.find((c) => c.id === id)!).filter(Boolean);
      if (pool.length === 0) throw new AppError(409, "룰렛에 넣을 수 있는 후보가 없어요. 결정을 다시 진행해주세요.");
      const { item, index } = pickUniform(pool, secureRandom);
      await insertResult(
        db,
        card,
        {
          candidate: item,
          mode: card.mode ?? "roulette",
          reasons: [
            fromTie ? `다수결 동점 후보 ${pool.length}개 중 룰렛 추첨` : `결정 대상 후보 ${pool.length}개 중 같은 확률로 추첨`,
            ...goodReasons(evaluations, item.id),
          ],
          detail: { kind: "roulette", pool: pool.map((c) => ({ candidateId: c.id, name: c.name })), winnerIndex: index, fromTie },
          requiredPhase: "roulette_ready",
        },
        now,
      );
      return;
    }

    case "battleReady": {
      const card = requireCard(data, action.cardId);
      requirePhase(card, "battle_lobby", "지금은 준비할 수 없어요. 게임이 이미 시작됐을 수 있어요.");
      await db.query(
        `INSERT INTO battle_entries (card_id, member_id, round, room_id, taps) VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (card_id, member_id, round) DO NOTHING`,
        [card.id, me.id, card.round, roomId],
      );
      return;
    }

    case "battleStart": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      requirePhase(card, "battle_lobby", "게임을 시작할 수 있는 단계가 아니에요.");
      if (!data.battle.some((b) => b.cardId === card.id)) throw new AppError(409, "준비 완료한 참가자가 있어야 시작할 수 있어요.");
      await db.query(
        `UPDATE decision_cards SET phase = 'battle_running', phase_started_at = $1, updated_at = $1
         WHERE id = $2 AND phase = 'battle_lobby' AND round = $3`,
        [now, card.id, card.round],
      );
      return;
    }

    case "battleTaps": {
      const card = requireCard(data, action.cardId);
      if (card.phase !== "battle_running" || card.phaseStartedAt === null) return; // 종료 후 도착한 입력은 조용히 무시
      const entry = data.battle.find((b) => b.cardId === card.id && b.memberId === me.id);
      if (!entry) throw new AppError(403, "준비 완료한 참가자만 참여할 수 있어요.");
      const accepted = acceptedTaps({
        requested: action.count,
        now,
        lastAcceptedAt: entry.lastAcceptedAt,
        phaseStartedAt: card.phaseStartedAt,
      });
      if (accepted === 0) return;
      // 같은 사람의 요청이 겹쳐도 한도를 두 번 쓰지 못하도록 직전 값 기준으로만 갱신
      await db.query(
        `UPDATE battle_entries SET taps = taps + $1, last_accepted_at = $2
         WHERE card_id = $3 AND member_id = $4 AND round = $5 AND last_accepted_at IS NOT DISTINCT FROM $6`,
        [accepted, now, card.id, me.id, card.round, entry.lastAcceptedAt],
      );
      return;
    }

    case "battlePick": {
      const card = requireCard(data, action.cardId);
      requirePhase(card, "battle_picking", "지금은 장소를 고를 수 있는 단계가 아니에요.");
      if (card.battleWinnerId !== me.id) throw new AppError(403, "결정권자만 장소를 고를 수 있어요.");
      const evaluations = evaluateCard(data, card);
      const eligible = eligibleCandidateIds(evaluations);
      if (!card.pool.includes(action.candidateId) || !eligible.includes(action.candidateId)) {
        throw new AppError(400, "결정 대상 후보만 고를 수 있어요.");
      }
      const candidate = data.candidates.find((c) => c.id === action.candidateId)!;
      const entries = data.battle.filter((b) => b.cardId === card.id).sort((a, b) => b.taps - a.taps);
      const ranking = [
        ...entries.filter((e) => e.memberId === me.id),
        ...entries.filter((e) => e.memberId !== me.id),
      ].map((e) => ({ memberId: e.memberId, nickname: data.members.find((m) => m.id === e.memberId)?.nickname ?? "참가자", taps: e.taps }));
      const myTaps = entries.find((e) => e.memberId === me.id)?.taps ?? 0;
      const detail: BattleDetail = { kind: "battle", ranking, winnerMemberId: me.id };
      await insertResult(
        db,
        card,
        {
          candidate,
          mode: "battle",
          reasons: [`${me.nickname}님이 ${myTaps}회 연타로 결정권 획득`, `${me.nickname}님이 직접 선택`, ...goodReasons(evaluations, candidate.id)],
          detail,
          requiredPhase: "battle_picking",
        },
        now,
      );
      return;
    }

    case "confirmResult": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      if (card.stage === "confirmed") throw new AppError(409, "이미 여행 보드에 확정된 결과예요.");
      const result = data.results.find((r) => r.cardId === card.id);
      if (card.phase !== "result" || !result) throw new AppError(409, "아직 확정할 결과가 없어요.");
      const rows = await db.query(
        `UPDATE decision_cards SET stage = 'confirmed', updated_at = $1
         WHERE id = $2 AND round = $3 AND stage = 'deciding' AND phase = 'result' RETURNING id`,
        [now, card.id, card.round],
      );
      if (rows.length === 0) throw new AppError(409, "이미 여행 보드에 확정된 결과예요.");
      await db.query(`UPDATE decision_results SET confirmed_at = $1 WHERE card_id = $2 AND round = $3 AND confirmed_at IS NULL`, [
        now,
        card.id,
        card.round,
      ]);
      return;
    }

    case "resetDecision": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      if (card.stage === "open") throw new AppError(409, "진행 중인 결정이 없어요.");
      const rows = await db.query(
        `UPDATE decision_cards SET stage = 'open', mode = NULL, phase = NULL, pool = '[]'::jsonb, tie_ids = '[]'::jsonb,
           phase_started_at = NULL, battle_winner_id = NULL, round = round + 1, updated_at = $1
         WHERE id = $2 AND round = $3 RETURNING round`,
        [now, card.id, card.round],
      );
      if (rows.length === 0) return;
      await db.batch([
        { text: "DELETE FROM votes WHERE card_id = $1 AND round < $2", params: [card.id, rows[0].round] },
        { text: "DELETE FROM battle_entries WHERE card_id = $1 AND round < $2", params: [card.id, rows[0].round] },
      ]);
      return;
    }

    case "setLock": {
      requireHost(me);
      const card = requireCard(data, action.cardId);
      await db.query("UPDATE decision_cards SET locked = $1, updated_at = $2 WHERE id = $3", [action.locked, now, card.id]);
      return;
    }
  }
}
