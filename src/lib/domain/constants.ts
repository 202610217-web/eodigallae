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

// 결정 카드 종류. 확정 일정표에서 숙소를 따로 모아 보여줄 때 쓴다. 아이콘·의견 투표 질문과는 관계없다.
export type CardCategory = "meal" | "activity" | "stay";
export const CARD_CATEGORIES: CardCategory[] = ["meal", "activity", "stay"];

/** 카드 제목의 시간대 단어로 시작 시각을 추측한다 (모임 만들 때 기본값). 없으면 null */
export function guessCardTime(title: string): string | null {
  const rules: [RegExp, string][] = [
    [/아침|조식/, "09:00"],
    [/브런치/, "10:30"],
    [/점심/, "12:00"],
    [/오전/, "10:00"],
    [/카페|디저트/, "15:00"],
    [/오후|낮/, "14:00"],
    [/저녁/, "18:00"],
    [/야식|밤|야경|술/, "21:00"],
    [/숙소|체크인|호텔|펜션/, "15:00"],
  ];
  return rules.find(([re]) => re.test(title))?.[1] ?? null;
}

// 데모 모임 전용 기본 카드 (일반 모임은 방장이 카드를 직접 만든다)
export const CARD_PRESETS: { key: string; title: string; category: CardCategory; icon: CardIconKey }[] = [
  { key: "lunch", title: "점심 식사", category: "meal", icon: "soup" },
  { key: "activity", title: "오후 활동", category: "activity", icon: "sun" },
  { key: "dinner", title: "저녁 식사", category: "meal", icon: "cooking-pot" },
  { key: "stay", title: "숙소", category: "stay", icon: "hotel" },
];

/**
 * 결정 카드 아이콘 목록 (장식용). category는 아이콘 고르는 화면의 묶음과,
 * 방장이 종류를 따로 고르기 전에 미리 골라 둘 기본값으로만 쓴다.
 */
export const CARD_ICONS = {
  utensils: { category: "meal", label: "식사" },
  soup: { category: "meal", label: "한식·국밥" },
  "cooking-pot": { category: "meal", label: "저녁·요리" },
  croissant: { category: "meal", label: "아침·브런치" },
  coffee: { category: "meal", label: "카페" },
  cake: { category: "meal", label: "디저트" },
  beer: { category: "meal", label: "술" },
  cookie: { category: "meal", label: "간식" },
  ticket: { category: "activity", label: "체험·입장" },
  sun: { category: "activity", label: "낮 활동" },
  "moon-star": { category: "activity", label: "밤·야경" },
  waves: { category: "activity", label: "바다·물놀이" },
  mountain: { category: "activity", label: "산·등산" },
  footprints: { category: "activity", label: "산책" },
  "shopping-bag": { category: "activity", label: "쇼핑" },
  camera: { category: "activity", label: "사진" },
  landmark: { category: "activity", label: "관광·전시" },
  bike: { category: "activity", label: "자전거" },
  car: { category: "activity", label: "드라이브·이동" },
  hotel: { category: "stay", label: "호텔·펜션" },
  bed: { category: "stay", label: "숙소" },
  tent: { category: "stay", label: "캠핑" },
} as const satisfies Record<string, { category: CardCategory; label: string }>;
export type CardIconKey = keyof typeof CARD_ICONS;
export const CARD_ICON_KEYS = Object.keys(CARD_ICONS) as CardIconKey[];

// 제목 단어로 아이콘 추측 (방장이 아이콘을 고르기 전 기본값, 아이콘이 없는 이전 카드 표시용)
const TITLE_ICON_RULES: [RegExp, CardIconKey][] = [
  [/술|맥주|포차|바$|펍|이자카야/, "beer"],
  [/카페|커피/, "coffee"],
  [/디저트|케이크|빵집/, "cake"],
  [/간식/, "cookie"],
  [/아침|조식|브런치/, "croissant"],
  [/점심/, "soup"],
  [/저녁|야식/, "cooking-pot"],
  [/캠핑|글램핑/, "tent"],
  [/숙소|호텔|펜션|숙박/, "hotel"],
  [/바다|해변|수영|물놀이/, "waves"],
  [/등산|산행|트레킹/, "mountain"],
  [/쇼핑|시장/, "shopping-bag"],
  [/사진|포토/, "camera"],
  [/박물관|전시|관광|투어|명소/, "landmark"],
  [/자전거|라이딩/, "bike"],
  [/산책|걷기/, "footprints"],
  [/드라이브|이동/, "car"],
  [/야경|밤/, "moon-star"],
  [/오후|낮|활동/, "sun"],
  [/식사|맛집|밥/, "utensils"],
];

export function guessCardIcon(title: string): CardIconKey | null {
  return TITLE_ICON_RULES.find(([re]) => re.test(title))?.[1] ?? null;
}

export function isCardIconKey(v: unknown): v is CardIconKey {
  return typeof v === "string" && v in CARD_ICONS;
}

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

export const DECISION_MODES = [
  { key: "vote", label: "다수결" },
  { key: "roulette", label: "운명의 룰렛" },
  { key: "ladder", label: "사다리 타기" },
  { key: "marble", label: "구슬 레이스" },
] as const;
export type DecisionMode = (typeof DECISION_MODES)[number]["key"];
export const DECISION_MODE_KEYS = DECISION_MODES.map((m) => m.key) as [DecisionMode, ...DecisionMode[]];

/** 예전에 쓰다 없앤 방식(결정권 쟁탈전 등)으로 남은 결과는 이름 대신 이 문구로 보여준다 */
export function modeLabel(mode: string): string {
  return DECISION_MODES.find((m) => m.key === mode)?.label ?? "이전 결정 방식";
}

// 사다리 타기: 참가자 중 결정권자를 뽑거나, 후보 중 하나를 바로 뽑는다
export const LADDER_TARGETS = [
  { key: "member", label: "결정권자 정하기" },
  { key: "candidate", label: "후보 바로 정하기" },
] as const;
export type LadderTarget = (typeof LADDER_TARGETS)[number]["key"];
export const LADDER_TARGET_KEYS = LADDER_TARGETS.map((t) => t.key) as [LadderTarget, ...LadderTarget[]];

export const LIMITS = {
  roomName: 30,
  nickname: 12,
  candidateName: 40,
  description: 200,
  link: 500,
  maxBudget: 10_000_000,
  maxMembers: 12,
  maxCandidates: 20,
  // 의견 투표
  questionTitle: 30,
  optionLabel: 30,
  maxQuestions: 10,
  minOptions: 2,
  maxOptions: 10,
  otherText: 100,
};
