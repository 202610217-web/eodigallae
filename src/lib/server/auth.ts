import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { COLOR_KEYS, type ColorKey } from "@/lib/domain/constants";
import { getDb } from "./db";
import { AppError } from "./errors";
import { memberIdByToken } from "./rooms";
import {
  SESSION_MAX_AGE,
  clearMemberCookie,
  clearSessionCookie,
  hashToken,
  newId,
  newToken,
  readAllMemberTokens,
  readMemberToken,
  readSessionToken,
  setMemberCookie,
  setSessionCookie,
} from "./session";

// 회원 계정은 선택 기능이다. 모임 참여 자체는 여전히 모임별 참여 토큰(쿠키)으로 하고,
// 계정은 참가자를 묶어 두었다가 다른 기기에서 로그인하면 그 기기에 참여 토큰을 새로 발급해 준다.

export interface SessionUser {
  id: string;
  username: string;
}

// ───── 비밀번호 (scrypt) ─────
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const { N, r, p, keylen } = SCRYPT;
  const key = await scryptAsync(password, salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// 없는 아이디로 로그인해도 응답 시간이 비슷하도록 비교용 해시를 한 번 만들어 둔다
let dummyHash: Promise<string> | null = null;

// ───── 가입 · 로그인 · 로그아웃 ─────
export async function signUp(username: string, password: string): Promise<SessionUser> {
  const db = await getDb();
  const id = newId("user");
  try {
    await db.query("INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)", [
      id,
      username,
      await hashPassword(password),
      Date.now(),
    ]);
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") throw new AppError(409, "이미 사용 중인 아이디예요. 다른 아이디를 입력해주세요.", "USERNAME_TAKEN");
    throw err;
  }
  await startSession(id);
  return { id, username };
}

export async function logIn(username: string, password: string): Promise<SessionUser> {
  const db = await getDb();
  const rows = await db.query("SELECT id, username, password_hash FROM users WHERE username = $1", [username]);
  const user = rows[0];
  if (!user) {
    dummyHash ??= hashPassword(newToken());
    await verifyPassword(password, await dummyHash);
    throw new AppError(401, "아이디 또는 비밀번호가 올바르지 않아요.", "BAD_CREDENTIALS");
  }
  if (!(await verifyPassword(password, String(user.password_hash)))) {
    throw new AppError(401, "아이디 또는 비밀번호가 올바르지 않아요.", "BAD_CREDENTIALS");
  }
  await startSession(String(user.id));
  return { id: String(user.id), username: String(user.username) };
}

export async function startSession(userId: string) {
  const db = await getDb();
  const token = newToken();
  const now = Date.now();
  await db.query("INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)", [
    hashToken(token),
    userId,
    now,
    now + SESSION_MAX_AGE * 1000,
  ]);
  await setSessionCookie(token);
  await claimGuestMemberships(userId);
}

/**
 * 로그아웃: 세션을 지우고, 이 브라우저에 남은 "내 계정에 연결된" 모임 참여 쿠키도 지운다.
 * (친구 휴대폰에서 로그인했다가 로그아웃해도 그 기기에 내 참가자 권한이 남지 않게)
 */
export async function logOut() {
  const user = await getCurrentUser();
  const token = await readSessionToken();
  const db = await getDb();
  if (token) await db.query("DELETE FROM user_sessions WHERE token_hash = $1", [hashToken(token)]);
  await clearSessionCookie();
  if (!user) return;
  for (const { roomId, token: memberToken } of await readAllMemberTokens()) {
    const memberId = await memberIdByToken(roomId, memberToken);
    if (!memberId) continue;
    const linked = await db.query("SELECT 1 FROM members WHERE id = $1 AND user_id = $2", [memberId, user.id]);
    if (linked.length === 0) continue;
    await db.query("DELETE FROM member_tokens WHERE token_hash = $1", [hashToken(memberToken)]);
    await clearMemberCookie(roomId);
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return userFromSessionToken(await readSessionToken());
}

/** 로그인이 필요한 API에서 사용. 로그인하지 않았으면 401 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "로그인이 필요해요. 로그인한 뒤 다시 시도해주세요.", "LOGIN_REQUIRED");
  return user;
}

/** 세션 토큰으로 사용자 조회 (만료된 세션은 무효). proxy에서도 쓴다. */
export async function userFromSessionToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const db = await getDb();
  const rows = await db.query(
    `SELECT u.id, u.username FROM user_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > $2`,
    [hashToken(token), Date.now()],
  );
  return rows[0] ? { id: String(rows[0].id), username: String(rows[0].username) } : null;
}

// ───── 모임 참가자와 계정 연결 ─────

/** 로그인·가입 직후: 이 브라우저로 비회원 참여했던 모임들을 계정에 연결 (이미 그 모임에 다른 참가자로 연결돼 있으면 건너뜀) */
async function claimGuestMemberships(userId: string) {
  const db = await getDb();
  for (const { roomId, token } of await readAllMemberTokens()) {
    const memberId = await memberIdByToken(roomId, token);
    if (!memberId) continue;
    await db.query(
      `UPDATE members SET user_id = $1 WHERE id = $2 AND user_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM members WHERE room_id = $3 AND user_id = $1)`,
      [userId, memberId, roomId],
    );
  }
}

/**
 * 이 요청에서 쓸 모임 참여 토큰.
 * 브라우저에 참여 쿠키가 있으면 그대로 쓰고(주기 조회마다 불리므로 추가 조회 없이),
 * 없으면 로그인한 계정에 연결된 참가자로 새 토큰을 발급한다.
 */
export async function resolveMemberToken(roomId: string): Promise<string | null> {
  const token = await readMemberToken(roomId);
  if (token) return token;
  const user = await getCurrentUser();
  if (!user) return token;
  const db = await getDb();
  const rows = await db.query("SELECT id FROM members WHERE room_id = $1 AND user_id = $2", [roomId, user.id]);
  if (!rows[0]) return token;
  const fresh = newToken();
  await db.query("INSERT INTO member_tokens (token_hash, member_id, room_id, created_at) VALUES ($1, $2, $3, $4)", [
    hashToken(fresh),
    String(rows[0].id),
    roomId,
    Date.now(),
  ]);
  await setMemberCookie(roomId, fresh);
  return fresh;
}

export interface MyRoom {
  id: string;
  name: string;
  tripStart: string;
  tripEnd: string | null;
  nickname: string;
  isHost: boolean;
  /** 홈 목록에서 진행 상황을 보여주기 위한 개수 */
  memberCount: number;
  /** 참가자 색 (들어온 순서). 홈 카드의 참가자 동그라미에 쓴다 */
  memberColors: ColorKey[];
  cardCount: number;
  confirmedCount: number;
  decidingCount: number;
}

export async function listMyRooms(userId: string): Promise<MyRoom[]> {
  const db = await getDb();
  const rows = await db.query(
    `SELECT r.id, r.name, r.trip_start, r.trip_end, m.nickname, m.is_host,
       (SELECT count(*) FROM members mm WHERE mm.room_id = r.id) AS member_count,
       (SELECT string_agg(mm.color, ',' ORDER BY mm.joined_at) FROM members mm WHERE mm.room_id = r.id) AS member_colors,
       (SELECT count(*) FROM decision_cards c WHERE c.room_id = r.id) AS card_count,
       (SELECT count(*) FROM decision_cards c WHERE c.room_id = r.id AND c.stage = 'confirmed') AS confirmed_count,
       (SELECT count(*) FROM decision_cards c WHERE c.room_id = r.id AND c.stage = 'deciding') AS deciding_count
     FROM members m
     JOIN rooms r ON r.id = m.room_id WHERE m.user_id = $1 ORDER BY r.trip_start DESC, r.created_at DESC LIMIT 50`,
    [userId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    tripStart: String(r.trip_start),
    tripEnd: r.trip_end === null ? null : String(r.trip_end),
    nickname: String(r.nickname),
    isHost: Boolean(r.is_host),
    memberCount: Number(r.member_count),
    memberColors: String(r.member_colors ?? "")
      .split(",")
      .filter((c): c is ColorKey => COLOR_KEYS.includes(c as ColorKey)),
    cardCount: Number(r.card_count),
    confirmedCount: Number(r.confirmed_count),
    decidingCount: Number(r.deciding_count),
  }));
}
