import type {
  CardCategory,
  CharacterKey,
  ColorKey,
  DecisionMode,
  SettingKey,
  TasteKey,
  VibeKey,
} from "./constants";

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

export interface MemberCondition {
  memberId: string;
  cardId: string;
  /** null = 예산 제한 없음 */
  maxBudget: number | null;
  restrictions: string[];
  setting: SettingKey;
  vibe: VibeKey;
  wish: string;
  note: string;
  ready: boolean;
  updatedAt: number;
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

/** DB에 저장되는 카드 단계. 화면 상태(조건 수집 중/후보 확인)는 여기서 파생한다. */
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

export type CheckState = "pass" | "conflict" | "needs_check";

export interface CandidateEvaluation {
  candidateId: string;
  state: CheckState;
  conflicts: string[];
  needsCheck: string[];
  /** 사람이 읽는 추천/주의 이유 (점수보다 먼저 보여준다) */
  reasons: { tone: "good" | "warn" | "bad" | "info"; text: string }[];
  tasteScore: number;
  matchedMembers: number;
  tasteMembers: number;
  recommended: boolean;
  rank: number;
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
  /** 방장이 고른 아이콘 키 (CARD_ICONS). 이전 카드는 null → 제목으로 추측 */
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
  conditions: MemberCondition[];
  candidates: Candidate[];
  evaluations: CandidateEvaluation[];
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
