import "server-only";
import { CHARACTER_KEYS, COLOR_KEYS, type CharacterKey, type ColorKey } from "@/lib/domain/constants";
import { getDb } from "./db";
import { AppError } from "./errors";
import { hashPassword, logOut, startSession, verifyPassword, type SessionUser } from "./auth";
import { hashToken, newRecoveryCode, normalizeRecoveryCode, readSessionToken } from "./session";

// 프로필·계정 설정과 비밀번호 재설정.
// 계정에는 이메일이 없으므로, 비밀번호를 잊었을 때는 미리 만들어 둔 복구 코드로 재설정한다.

export interface Account {
  username: string;
  nickname: string;
  character: CharacterKey;
  color: ColorKey;
  /** 프로필을 한 번이라도 저장했는지 (아니면 아이디와 기본 캐릭터로 보여준다) */
  hasProfile: boolean;
  /** 비밀번호 재설정용 복구 코드를 만들어 두었는지 */
  hasRecovery: boolean;
  createdAt: number;
}

const WRONG_PASSWORD = "현재 비밀번호가 올바르지 않아요.";

export async function getAccount(userId: string): Promise<Account> {
  const db = await getDb();
  const rows = await db.query("SELECT username, nickname, character, color, recovery_hash, created_at FROM users WHERE id = $1", [userId]);
  const r = rows[0];
  if (!r) throw new AppError(401, "로그인이 필요해요. 로그인한 뒤 다시 시도해주세요.", "LOGIN_REQUIRED");
  const character = CHARACTER_KEYS.includes(r.character as CharacterKey) ? (r.character as CharacterKey) : "cat";
  const color = COLOR_KEYS.includes(r.color as ColorKey) ? (r.color as ColorKey) : "coral";
  return {
    username: String(r.username),
    nickname: r.nickname ? String(r.nickname) : String(r.username),
    character,
    color,
    hasProfile: Boolean(r.nickname),
    hasRecovery: Boolean(r.recovery_hash),
    createdAt: Number(r.created_at),
  };
}

/** 비밀번호가 필요한 설정 변경 전에 본인 확인 */
async function confirmPassword(userId: string, password: string) {
  const db = await getDb();
  const rows = await db.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!rows[0] || !(await verifyPassword(password, String(rows[0].password_hash)))) {
    throw new AppError(403, WRONG_PASSWORD, "WRONG_PASSWORD");
  }
}

/** 지금 쓰는 기기의 세션은 두고, 같은 계정의 다른 세션을 모두 끝낸다. 지운 개수를 돌려준다 */
async function endOtherSessions(userId: string): Promise<number> {
  const db = await getDb();
  const token = await readSessionToken();
  const rows = await db.query("DELETE FROM user_sessions WHERE user_id = $1 AND token_hash <> $2 RETURNING token_hash", [
    userId,
    token ? hashToken(token) : "-",
  ]);
  return rows.length;
}

export async function updateProfile(user: SessionUser, profile: { nickname: string; character: CharacterKey; color: ColorKey }) {
  const db = await getDb();
  await db.query("UPDATE users SET nickname = $2, character = $3, color = $4 WHERE id = $1", [
    user.id,
    profile.nickname,
    profile.character,
    profile.color,
  ]);
}

export async function changeUsername(user: SessionUser, username: string, password: string) {
  await confirmPassword(user.id, password);
  if (username === user.username) return;
  const db = await getDb();
  try {
    await db.query("UPDATE users SET username = $2 WHERE id = $1", [user.id, username]);
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") throw new AppError(409, "이미 사용 중인 아이디예요. 다른 아이디를 입력해주세요.", "USERNAME_TAKEN");
    throw err;
  }
}

/** 비밀번호 변경. 다른 기기에 남은 로그인은 모두 끝낸다(이 기기는 그대로 로그인 상태) */
export async function changePassword(user: SessionUser, currentPassword: string, newPassword: string) {
  await confirmPassword(user.id, currentPassword);
  const db = await getDb();
  await db.query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, await hashPassword(newPassword)]);
  return { endedSessions: await endOtherSessions(user.id) };
}

export async function logOutOtherDevices(user: SessionUser) {
  return { endedSessions: await endOtherSessions(user.id) };
}

/** 새 복구 코드를 만든다. 원문은 이 응답에서 한 번만 보여주고, 이전 코드는 더 이상 쓸 수 없다 */
export async function createRecoveryCode(user: SessionUser, password: string): Promise<string> {
  await confirmPassword(user.id, password);
  const code = newRecoveryCode();
  const db = await getDb();
  await db.query("UPDATE users SET recovery_hash = $2 WHERE id = $1", [user.id, hashToken(normalizeRecoveryCode(code))]);
  return code;
}

/**
 * 비밀번호를 잊었을 때: 아이디 + 복구 코드로 새 비밀번호를 정한다.
 * 복구 코드는 한 번 쓰면 지우고, 모든 기기의 로그인을 끝낸 뒤 이 기기로 새로 로그인한다.
 */
export async function resetPassword(username: string, recoveryCode: string, newPassword: string): Promise<SessionUser> {
  const db = await getDb();
  const code = normalizeRecoveryCode(recoveryCode);
  const rows = await db.query("SELECT id, username FROM users WHERE username = $1 AND recovery_hash = $2", [username, hashToken(code)]);
  // 아이디가 없는 경우와 코드가 틀린 경우를 같은 문구로 알려준다
  if (code.length !== 16 || !rows[0]) {
    throw new AppError(400, "아이디 또는 복구 코드가 올바르지 않아요. 복구 코드는 계정 설정에서 만들어 둔 16자리 코드예요.", "BAD_RECOVERY");
  }
  const id = String(rows[0].id);
  // 같은 코드로 동시에 두 번 재설정되지 않도록, 코드가 그대로일 때만 바꾼다
  const updated = await db.query(
    "UPDATE users SET password_hash = $2, recovery_hash = NULL WHERE id = $1 AND recovery_hash = $3 RETURNING id",
    [id, await hashPassword(newPassword), hashToken(code)],
  );
  if (!updated[0]) throw new AppError(409, "이미 사용한 복구 코드예요. 로그인 화면에서 다시 시도해주세요.", "BAD_RECOVERY");
  await db.query("DELETE FROM user_sessions WHERE user_id = $1", [id]);
  await startSession(id);
  return { id, username: String(rows[0].username) };
}

/**
 * 회원 탈퇴. 계정과 로그인 기록을 지운다. 참여했던 모임의 참가자 기록은 친구들을 위해 남기고 계정 연결만 끊는다.
 * 로그인으로 다른 기기에 발급했던 추가 참여 토큰은 지워, 그 기기에서는 더 이상 그 참가자로 들어갈 수 없다.
 */
export async function deleteAccount(user: SessionUser, password: string) {
  await confirmPassword(user.id, password);
  // 이 브라우저의 로그인과, 계정에 연결된 참여 쿠키부터 정리한다
  await logOut();
  const db = await getDb();
  await db.batch([
    { text: "DELETE FROM member_tokens WHERE member_id IN (SELECT id FROM members WHERE user_id = $1)", params: [user.id] },
    { text: "DELETE FROM users WHERE id = $1", params: [user.id] },
  ]);
}
