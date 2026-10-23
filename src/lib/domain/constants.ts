// 서비스 전역에서 쓰는 고정 선택지. UI와 서버 검증이 같은 목록을 공유한다.

export const TASTES = [
  { key: "food", label: "맛집", title: "맛집 탐험가" },
  { key: "rest", label: "휴식", title: "휴식 수호자" },
  { key: "photo", label: "사진", title: "사진 장인" },
  { key: "experience", label: "체험", title: "체험 수집가" },
  { key: "nature", label: "자연", title: "자연 산책러" },
  { key: "culture", label: "문화·전시", title: "전시 감상가" },
  { key: "shopping", label: "쇼핑", title: "쇼핑 사냥꾼" },
] as const;

export type TasteKey = (typeof TASTES)[number]["key"];
export const TASTE_KEYS = TASTES.map((t) => t.key) as [TasteKey, ...TasteKey[]];

export function tasteLabel(key: TasteKey): string {
  return TASTES.find((t) => t.key === key)?.label ?? key;
}

export const CHARACTERS = [
  { key: "cat", label: "고양이" },
  { key: "dog", label: "강아지" },
  { key: "rabbit", label: "토끼" },
  { key: "bird", label: "새" },
  { key: "fish", label: "물고기" },
  { key: "squirrel", label: "다람쥐" },
  { key: "turtle", label: "거북이" },
  { key: "snail", label: "달팽이" },
] as const;

export type CharacterKey = (typeof CHARACTERS)[number]["key"];
export const CHARACTER_KEYS = CHARACTERS.map((c) => c.key) as [CharacterKey, ...CharacterKey[]];

export const COLORS = [
  { key: "coral", hex: "#FF755E" },
  { key: "sky", hex: "#4C8DF6" },
  { key: "mint", hex: "#2FB38A" },
  { key: "violet", hex: "#8B6CF2" },
  { key: "amber", hex: "#F0A428" },
  { key: "rose", hex: "#E5588C" },
] as const;

export type ColorKey = (typeof COLORS)[number]["key"];
export const COLOR_KEYS = COLORS.map((c) => c.key) as [ColorKey, ...ColorKey[]];

export function colorHex(key: ColorKey): string {
  return COLORS.find((c) => c.key === key)?.hex ?? COLORS[0].hex;
}

// 결정 카드 종류. 종류마다 필수 제외 조건 목록이 다르다.
export type CardCategory = "meal" | "activity" | "stay";

export const CARD_PRESETS: { key: string; title: string; category: CardCategory }[] = [
  { key: "lunch", title: "토요일 점심", category: "meal" },
  { key: "activity", title: "오후 활동", category: "activity" },
  { key: "dinner", title: "저녁 식사", category: "meal" },
  { key: "stay", title: "숙소", category: "stay" },
];

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  meal: "식사",
  activity: "활동",
  stay: "숙소",
};

export const RESTRICTIONS: Record<
  CardCategory,
  { memberLabel: string; candidateLabel: string; options: string[] }
> = {
  meal: {
    memberLabel: "피해야 하는 음식",
    candidateLabel: "포함된 음식 종류",
    options: ["해산물", "날것(회·육회)", "매운 음식", "돼지고기", "소고기", "유제품", "견과류", "밀가루", "술 위주 메뉴"],
  },
  activity: {
    memberLabel: "참여할 수 없는 활동",
    candidateLabel: "포함된 활동 요소",
    options: ["물놀이·수상 활동", "등산·오래 걷기", "높은 곳·놀이기구", "동물 접촉", "음주", "어두운 공간", "늦은 밤 활동"],
  },
  stay: {
    memberLabel: "피해야 하는 숙소 조건",
    candidateLabel: "숙소 특징",
    options: ["공용 욕실", "다인실 혼숙", "반려동물 동반", "흡연 객실", "엘리베이터 없음", "취사 불가"],
  },
};

export const SETTINGS = [
  { key: "indoor", label: "실내" },
  { key: "outdoor", label: "야외" },
  { key: "any", label: "상관없음" },
] as const;
export type SettingKey = (typeof SETTINGS)[number]["key"];

export const VIBES = [
  { key: "quiet", label: "조용한 곳" },
  { key: "lively", label: "활기찬 곳" },
  { key: "any", label: "상관없음" },
] as const;
export type VibeKey = (typeof VIBES)[number]["key"];

export const DECISION_MODES = [
  { key: "vote", label: "다수결" },
  { key: "roulette", label: "운명의 룰렛" },
  { key: "battle", label: "결정권 쟁탈전" },
] as const;
export type DecisionMode = (typeof DECISION_MODES)[number]["key"];

export function modeLabel(mode: DecisionMode): string {
  return DECISION_MODES.find((m) => m.key === mode)?.label ?? mode;
}

// 결정권 쟁탈전 타이밍 (ms)
export const BATTLE_COUNTDOWN_MS = 3_000;
export const BATTLE_TAP_MS = 10_000;
// 네트워크 지연으로 늦게 도착한 마지막 묶음만 받아주는 유예 시간
export const BATTLE_GRACE_MS = 1_500;
// 사람이 낼 수 있는 연타 속도 상한 (초당)
export const BATTLE_MAX_TAPS_PER_SEC = 15;
// 한 묶음이 인정받을 수 있는 최대 시간 폭. 입력을 모아 두었다가 끝에 한꺼번에 보내는 것을 막는다.
export const BATTLE_MAX_BATCH_SPAN_MS = 1_000;

export const LIMITS = {
  roomName: 30,
  nickname: 12,
  candidateName: 40,
  description: 200,
  wish: 60,
  note: 200,
  link: 500,
  maxBudget: 10_000_000,
  maxMembers: 12,
  maxCandidates: 20,
};
