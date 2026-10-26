import { z } from "zod";
import { CARD_ICONS, CARD_ICON_KEYS, CHARACTER_KEYS, COLOR_KEYS, LIMITS, TASTE_KEYS, type CardIconKey } from "./domain/constants";

// 서버 API가 받는 모든 입력의 스키마. 오류 메시지는 화면에 그대로 보여줄 수 있는 문장으로 쓴다.

const trimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}은(는) ${max}자 이내로 입력해주세요.`);

const nickname = trimmed(LIMITS.nickname, "닉네임").min(1, "닉네임을 입력해주세요.");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않아요.");
const tasteKey = z.enum(TASTE_KEYS);
const id = z.string().min(1).max(64);

// 결정 카드 일정 (몇 일차 · 시작 시각). 둘 다 비워 둘 수 있다.
const cardSchedule = {
  day: z.number().int().min(1, "일차를 다시 골라주세요.").max(30, "일차를 다시 골라주세요.").nullable().default(null),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시간 형식이 올바르지 않아요.")
    .nullable()
    .default(null),
};

export const profileSchema = z.object({
  nickname,
  character: z.enum(CHARACTER_KEYS),
  color: z.enum(COLOR_KEYS),
});

export const createRoomSchema = z
  .object({
    name: trimmed(LIMITS.roomName, "모임 이름").min(1, "모임 이름을 입력해주세요."),
    tripStart: dateStr,
    tripEnd: dateStr.nullable(),
    cards: z
      .array(
        z
          .object({
            title: trimmed(20, "결정 카드 이름").min(1, "결정 카드 이름을 입력해주세요."),
            // 아이콘을 고르면 카드 종류는 아이콘에서 정해진다. 아이콘 없이 종류만 보내는 것도 허용(이전 방식)
            icon: z.enum(CARD_ICON_KEYS as [CardIconKey, ...CardIconKey[]]).nullable().default(null),
            category: z.enum(["meal", "activity", "stay"]).optional(),
            ...cardSchedule,
          })
          .refine((c) => c.icon !== null || c.category !== undefined, { message: "결정 카드 아이콘을 골라주세요." })
          .transform(({ category, ...c }) => ({ ...c, category: c.icon ? CARD_ICONS[c.icon].category : category! })),
      )
      .min(1, "결정 카드를 하나 이상 골라주세요.")
      .max(8, "결정 카드는 8개까지 만들 수 있어요."),
    host: profileSchema,
  })
  .refine((v) => !v.tripEnd || v.tripEnd >= v.tripStart, {
    message: "여행 종료일이 시작일보다 빠를 수 없어요.",
  });

export const joinSchema = profileSchema;

// 회원 계정: 아이디는 소문자로 정규화해 저장한다
export const authSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{4,20}$/, "아이디는 영문 소문자·숫자·밑줄(_)로 4~20자 입력해주세요."),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상 입력해주세요.")
    .max(100, "비밀번호는 100자 이내로 입력해주세요."),
});

const money = z
  .number({ message: "금액은 숫자로 입력해주세요." })
  .int("금액은 원 단위 정수로 입력해주세요.")
  .min(0, "금액은 0원 이상이어야 해요.")
  .max(LIMITS.maxBudget, "금액이 너무 커요.");

export const conditionInput = z.object({
  cardId: id,
  maxBudget: money.nullable(),
  restrictions: z.array(z.string().max(30)).max(20),
  setting: z.enum(["indoor", "outdoor", "any"]),
  vibe: z.enum(["quiet", "lively", "any"]),
  wish: trimmed(LIMITS.wish, "원하는 점"),
  note: trimmed(LIMITS.note, "추가 의견"),
  ready: z.boolean(),
});

const link = z
  .string()
  .trim()
  .max(LIMITS.link)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "링크는 http:// 또는 https:// 로 시작해야 해요.");

export const candidateFields = z.object({
  name: trimmed(LIMITS.candidateName, "후보 이름").min(1, "장소 또는 활동 이름을 입력해주세요."),
  cost: money.nullable(),
  tags: z
    .array(tasteKey)
    .max(4, "태그는 4개까지 고를 수 있어요.")
    .refine((t) => new Set(t).size === t.length, "같은 태그를 두 번 고를 수 없어요."),
  features: z.array(z.string().max(30)).max(20).nullable(),
  setting: z.enum(["indoor", "outdoor", "both", "other", "unknown"]),
  vibe: z.enum(["quiet", "lively", "other", "unknown"]),
  // '기타'를 골랐을 때 적은 내용
  notes: z
    .object({
      cost: trimmed(40, "비용 기타 내용").optional(),
      features: trimmed(40, "기타 내용").optional(),
      setting: trimmed(40, "실내/야외 기타 내용").optional(),
      vibe: trimmed(40, "분위기 기타 내용").optional(),
    })
    .default({}),
  link,
  description: trimmed(LIMITS.description, "설명"),
});
export type CandidateFields = z.infer<typeof candidateFields>;

export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("setTaste"),
    ranks: z
      .tuple([tasteKey, tasteKey, tasteKey])
      .refine((r) => new Set(r).size === 3, "1~3순위는 서로 다른 항목이어야 해요."),
  }),
  z.object({ type: z.literal("saveCondition"), condition: conditionInput }),
  z.object({ type: z.literal("setConditionReady"), cardId: id, ready: z.boolean() }),
  z.object({ type: z.literal("addCandidate"), cardId: id, candidate: candidateFields }),
  z.object({ type: z.literal("updateCandidate"), candidateId: id, candidate: candidateFields }),
  z.object({ type: z.literal("deleteCandidate"), candidateId: id }),
  z.object({
    type: z.literal("startDecision"),
    cardId: id,
    mode: z.enum(["vote", "roulette", "battle", "marble"]),
    // 방장이 결정 전에 빼기로 고른 후보 (조건 충돌·확인 필요 후보 검토 단계)
    excludeIds: z.array(id).max(100).default([]),
  }),
  z.object({ type: z.literal("castVote"), cardId: id, candidateId: id }),
  z.object({ type: z.literal("closeVote"), cardId: id }),
  z.object({ type: z.literal("startTieRoulette"), cardId: id }),
  z.object({ type: z.literal("spinRoulette"), cardId: id }),
  z.object({ type: z.literal("startMarble"), cardId: id }),
  z.object({ type: z.literal("battleReady"), cardId: id }),
  z.object({ type: z.literal("battleStart"), cardId: id }),
  z.object({ type: z.literal("battleTaps"), cardId: id, count: z.number().int().min(0).max(200) }),
  z.object({ type: z.literal("battlePick"), cardId: id, candidateId: id }),
  z.object({ type: z.literal("confirmResult"), cardId: id }),
  z.object({ type: z.literal("resetDecision"), cardId: id }),
  z.object({ type: z.literal("setLock"), cardId: id, locked: z.boolean() }),
  z.object({ type: z.literal("setCardSchedule"), cardId: id, ...cardSchedule }),
  z.object({ type: z.literal("transferHost"), memberId: id }),
  z.object({ type: z.literal("kickMember"), memberId: id }),
]);
export type RoomAction = z.infer<typeof actionSchema>;
