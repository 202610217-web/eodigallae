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
