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

export type CandidateSetting = "indoor" | "outdoor" | "both" | "unknown";
export type CandidateVibe = "quiet" | "lively" | "unknown";

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
  link: string;
  description: string;
  createdAt: number;
}

/** DB에 저장되는 카드 단계. 화면 상태(조건 수집 중/후보 확인)는 여기서 파생한다. */
export type CardStage = "open" | "deciding" | "confirmed";

export type CardPhase =
  | "voting"
  | "tallying"
  | "tie"
  | "roulette_ready"
  | "battle_lobby"
  | "battle_running"
  | "battle_picking"
  | "result";

export type CardDisplayStatus = "collecting" | "reviewing" | "deciding" | "confirmed";

export interface CandidateSnapshot {
  id: string;
  name: string;
  cost: number | null;
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
export type ResultDetail = VoteDetail | RouletteDetail | BattleDetail;

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
  sortOrder: number;
  stage: CardStage;
  status: CardDisplayStatus;
  mode: DecisionMode | null;
  phase: CardPhase | null;
  round: number;
  locked: boolean;
  pool: string[];
  tieCandidateIds: string[];
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
