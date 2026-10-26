import type { CardCategory, CharacterKey, ColorKey, DecisionMode, TasteKey } from "./constants";

export type TasteRanks = [TasteKey, TasteKey, TasteKey];

export interface Member {
  id: string;
  nickname: string;
  character: CharacterKey;
  color: ColorKey;
  isHost: boolean;
  /** 데모 모임의 가상 참가자 (참여 토큰도 계정도 없음). 방장을 넘겨받을 수 없다. */
  isBot: boolean;
  joinedAt: number;
  taste: TasteRanks | null;
}

// ───── 의견 투표 ─────
// 방장이 일정마다 질문과 보기를 직접 만든다. '기타'(직접 입력)는 보기 목록에 넣지 않고 모든 질문에 기본으로 붙는다.

export interface OpinionOption {
  id: string;
  label: string;
}

export interface OpinionQuestion {
  id: string;
  title: string;
  /** true = 복수 선택, false = 하나만 */
  multiple: boolean;
  options: OpinionOption[];
}

export interface OpinionAnswer {
  optionIds: string[];
  /** 기타를 골랐을 때 적은 내용. 기타를 고르지 않았으면 null */
  other: string | null;
}

/** 질문 id → 답 */
export type OpinionAnswers = Record<string, OpinionAnswer>;

export interface OpinionQuestionResult {
  questionId: string;
  /** 보기별 선택 인원 (복수 선택이면 합이 응답자 수보다 클 수 있다) */
  options: { optionId: string; count: number }[];
  otherCount: number;
  /** 기타 의견 원문. 누가 적었는지 알 수 없게 글자 순으로 정렬한다 */
  otherTexts: string[];
}

export interface OpinionResults {
  respondents: number;
  questions: OpinionQuestionResult[];
}

export interface OpinionView {
  questions: OpinionQuestion[];
  /** 의견을 제출한 참가자 (제출 여부만, 무엇을 골랐는지는 담지 않는다) */
  submittedMemberIds: string[];
  /** 내가 제출한 응답 (확인·수정용). 제출 전이면 null */
  myAnswers: OpinionAnswers | null;
  /** 익명 집계. 내가 제출하기 전에는 서버가 보내지 않는다 */
  results: OpinionResults | null;
}

// "unknown" = 고르지 않음, "other" = 기타(내용은 notes에)
export type CandidateSetting = "indoor" | "outdoor" | "both" | "other" | "unknown";
export type CandidateVibe = "quiet" | "lively" | "other" | "unknown";

export interface Candidate {
  id: string;
  cardId: string;
  createdBy: string;
  name: string;
  /** null = 비용 정보 없음 */
  cost: number | null;
  tags: TasteKey[];
  /** null = 정보 없음, [] = 해당 없음 */
  features: string[] | null;
  setting: CandidateSetting;
  vibe: CandidateVibe;
  /** '기타'를 고르고 적은 내용. 해당 값은 비용 null / 특징 null / 실내·야외·분위기 "other" */
  notes: CandidateNotes;
  link: string;
  description: string;
  createdAt: number;
}

export interface CandidateNotes {
  cost?: string;
  features?: string;
  setting?: string;
  vibe?: string;
}

/** DB에 저장되는 카드 단계. 화면 상태(의견 수집 중/후보 확인)는 여기서 파생한다. */
export type CardStage = "open" | "deciding" | "confirmed";

export type CardPhase =
  | "voting"
  | "tallying"
  | "tie"
  | "roulette_ready"
  | "marble_ready"
  | "marble_running"
  | "battle_lobby"
  | "battle_running"
  | "battle_picking"
  | "result";

export type CardDisplayStatus = "collecting" | "reviewing" | "deciding" | "confirmed";

export interface CandidateSnapshot {
  id: string;
  name: string;
  cost: number | null;
  /** 비용을 '기타'로 적은 내용 (이전 결과에는 없음) */
  costNote?: string;
  tags: TasteKey[];
  description: string;
  link: string;
}

export interface VoteDetail {
  kind: "vote";
  counts: { candidateId: string; name: string; votes: number }[];
  totalVoters: number;
}
export interface RouletteDetail {
  kind: "roulette";
  pool: { candidateId: string; name: string }[];
  winnerIndex: number;
  fromTie: boolean;
}
export interface BattleDetail {
  kind: "battle";
  ranking: { memberId: string; nickname: string; taps: number }[];
  winnerMemberId: string;
}
export interface MarbleDetail {
  kind: "marble";
  /** 도착 순서 (첫 번째가 당첨) */
  order: { candidateId: string; name: string }[];
  startsAt: number;
  endsAt: number;
}
export type ResultDetail = VoteDetail | RouletteDetail | BattleDetail | MarbleDetail;

export interface DecisionResult {
  cardId: string;
  round: number;
  mode: DecisionMode;
  candidate: CandidateSnapshot;
  reasons: string[];
  detail: ResultDetail;
  createdAt: number;
  confirmedAt: number | null;
}

export interface VotingView {
  votedCount: number;
  eligibleVoters: number;
  myVoteCandidateId: string | null;
  /** 투표 중에는 null, 마감 후에만 공개 */
  counts: { candidateId: string; votes: number }[] | null;
}

export interface BattleEntryView {
  memberId: string;
  ready: boolean;
  /** 진행 중에는 본인 것만 공개, 종료 후 전원 공개 */
  taps: number | null;
}

export interface DecisionCardView {
  id: string;
  title: string;
  category: CardCategory;
  /** 방장이 고른 아이콘 키 (CARD_ICONS, 장식용). 이전 카드는 null → 제목으로 추측 */
  icon: string | null;
  sortOrder: number;
  /** 몇 일차 (1부터), 정하지 않았으면 null */
  day: number | null;
  /** 시작 시각 "HH:MM", 정하지 않았으면 null */
  time: string | null;
  stage: CardStage;
  status: CardDisplayStatus;
  mode: DecisionMode | null;
  phase: CardPhase | null;
  round: number;
  locked: boolean;
  pool: string[];
  tieCandidateIds: string[];
  /** 구슬 레이스 재생 중일 때의 서버 시각 (결과는 끝날 때까지 숨긴다) */
  marble: { startsAt: number; endsAt: number } | null;
  phaseStartedAt: number | null;
  battleWinnerId: string | null;
  opinion: OpinionView;
  candidates: Candidate[];
  voting: VotingView | null;
  battle: BattleEntryView[];
  result: DecisionResult | null;
}

export interface RoomView {
  id: string;
  name: string;
  tripStart: string;
  tripEnd: string | null;
  inviteCode: string;
  isDemo: boolean;
  me: Member;
  members: Member[];
  cards: DecisionCardView[];
  serverNow: number;
  storage: "neon" | "local";
}
