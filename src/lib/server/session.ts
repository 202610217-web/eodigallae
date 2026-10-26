import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";

// 참가자는 비밀번호 없이 참여한다. 대신 모임마다 무작위 참여 토큰을 httpOnly 쿠키로 발급하고,
// DB에는 토큰의 해시만 저장해 닉네임만으로 다른 사람을 흉내 낼 수 없게 한다.

const COOKIE_PREFIX = "edg_";
const MAX_AGE = 60 * 60 * 24 * 60; // 60일

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

// 헷갈리는 문자(0/O, 1/I/L)를 뺀 6자리 초대 코드
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function newInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function setMemberCookie(roomId: string, token: string) {
  const jar = await cookies();
  jar.set(COOKIE_PREFIX + roomId, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readMemberToken(roomId: string): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_PREFIX + roomId)?.value ?? null;
}

export async function clearMemberCookie(roomId: string) {
  const jar = await cookies();
  jar.delete(COOKIE_PREFIX + roomId);
}

/** 이 브라우저에 있는 모든 모임 참여 토큰 (모임 id는 "room_"으로 시작) */
export async function readAllMemberTokens(): Promise<{ roomId: string; token: string }[]> {
  const jar = await cookies();
  return jar
    .getAll()
    .filter((c) => c.name.startsWith(COOKIE_PREFIX + "room_"))
    .map((c) => ({ roomId: c.name.slice(COOKIE_PREFIX.length), token: c.value }));
}

// ───── 회원 로그인 세션 ─────
const SESSION_COOKIE = "edg_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30일

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
