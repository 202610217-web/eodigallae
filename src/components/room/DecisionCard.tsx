"use client";

import {
  BedDouble,
  Beer,
  Bike,
  CakeSlice,
  Camera,
  Car,
  ChevronRight,
  CircleCheck,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  Footprints,
  Hotel,
  Landmark,
  Lock,
  MoonStar,
  Mountain,
  ShoppingBag,
  Soup,
  Sun,
  Tent,
  Ticket,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { createElement, useId, type CSSProperties } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/client/cn";
import { formatCost, formatSchedule } from "@/lib/client/format";
import { cardSubmittedCount, hasSubmittedOpinion } from "@/lib/client/selectors";
import { guessCardIcon, isCardIconKey, modeLabel, type CardCategory, type CardIconKey } from "@/lib/domain/constants";
import type { DecisionCardView } from "@/lib/domain/types";
import { useRoom } from "./RoomProvider";

export const CATEGORY_ICON: Record<CardCategory, LucideIcon> = {
  meal: UtensilsCrossed,
  activity: Ticket,
  stay: BedDouble,
};

export const CARD_ICON_COMPONENT: Record<CardIconKey, LucideIcon> = {
  utensils: UtensilsCrossed,
  soup: Soup,
  "cooking-pot": CookingPot,
  croissant: Croissant,
  coffee: Coffee,
  cake: CakeSlice,
  beer: Beer,
  cookie: Cookie,
  ticket: Ticket,
  sun: Sun,
  "moon-star": MoonStar,
  waves: Waves,
  mountain: Mountain,
  footprints: Footprints,
  "shopping-bag": ShoppingBag,
  camera: Camera,
  landmark: Landmark,
  bike: Bike,
  car: Car,
  hotel: Hotel,
  bed: BedDouble,
  tent: Tent,
};

/** 카드 아이콘: 방장이 고른 아이콘 → (이전 카드는) 제목으로 추측 → 종류별 기본 아이콘 */
export function cardIcon(icon: string | null | undefined, title: string, category: CardCategory): LucideIcon {
  const key = isCardIconKey(icon) ? icon : guessCardIcon(title);
  return key ? CARD_ICON_COMPONENT[key] : CATEGORY_ICON[category];
}

/** 결정 카드 아이콘 (장식용) */
export function CardIcon({
  icon,
  title,
  category,
  className,
}: {
  icon?: string | null;
  title: string;
  category: CardCategory;
  className?: string;
}) {
  return createElement(cardIcon(icon, title, category), { className, "aria-hidden": true });
}

export function phaseText(card: DecisionCardView): string | null {
  if (card.stage !== "deciding" || !card.mode) return null;
  const mode = modeLabel(card.mode);
  switch (card.phase) {
    case "voting":
      return `${mode} 투표 진행 중`;
    case "tallying":
      return "투표 집계 중";
    case "tie":
      return "동점! 룰렛 대기 중";
    case "roulette_ready":
      return "룰렛 준비 중";
    case "marble_ready":
      return "구슬 출발 대기 중";
    case "marble_running":
      return "구슬 레이스 진행 중";
    case "battle_lobby":
      return "쟁탈전 참가자 모집 중";
    case "battle_running":
      return "쟁탈전 진행 중";
    case "battle_picking":
      return "결정권자가 고르는 중";
    case "result":
      return "결과 공개 · 확정 대기";
    default:
      return mode;
  }
}

/** 카드 아래 한 줄 안내. action: 지금 내가 하거나 같이 볼 일이라 강조한다 */
function nextStep(card: DecisionCardView, submitted: boolean, isHost: boolean): { text: string; action: boolean } {
  const phase = phaseText(card);
  if (phase) return { text: phase, action: true };
  if (card.stage === "open" && !submitted) {
    if (card.locked) return { text: "방장이 잠근 카드예요", action: false };
    if (card.opinion.questions.length === 0) {
      return isHost ? { text: "의견 투표 질문을 만들어주세요", action: true } : { text: "방장이 의견 투표 질문을 준비 중이에요", action: false };
    }
    return { text: "의견을 제출해주세요", action: true };
  }
  if (card.candidates.length === 0) return { text: "의견 집계를 보고 첫 번째 후보를 등록해주세요", action: false };
  return { text: "후보를 보고 결정 방식을 골라요", action: false };
}

export function DecisionCard({ card, index, onOpen }: { card: DecisionCardView; index: number; onOpen: () => void }) {
  const { view, justConfirmed } = useRoom();
  const statusId = useId();
  const ready = cardSubmittedCount(card);
  const total = view.members.length;
  const confirmed = card.stage === "confirmed" && card.result;
  const schedule = formatSchedule(card.day, card.time);
  const step = nextStep(card, hasSubmittedOpinion(card, view.me.id), view.me.isHost);

  // 카드 전체가 눌리지만, 제목·정보가 버튼 안에 묻히지 않도록 제목 버튼의 ::after를 카드 크기로 펼친다
  return (
    <article
      className={cn(
        "stagger group relative flex min-h-44 w-full flex-col rounded-[var(--radius-card)] border bg-white p-4 transition-colors hover:border-ink-faint",
        confirmed ? "border-[#bfe2cb]" : card.stage === "deciding" ? "border-coral/50" : "border-transparent",
        justConfirmed === card.id && "animate-confirm",
      )}
      style={{ "--i": index } as CSSProperties}
    >
      <div className="flex w-full items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-ink">
          <CardIcon icon={card.icon} title={card.title} category={card.category} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-lg font-bold leading-snug">
            <button
              type="button"
              onClick={onOpen}
              aria-label={`${card.title} 상세 열기`}
              aria-describedby={`${statusId}-status ${statusId}-detail`}
              className="truncate text-left after:absolute after:inset-0 after:rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-coral-strong"
            >
              {card.title}
            </button>
            {card.locked && <Lock className="size-4 shrink-0 text-ink-soft" role="img" aria-label="잠김" />}
          </h3>
          <div id={`${statusId}-status`} className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={card.status} />
            {schedule && <span className="text-xs font-semibold text-ink-soft tabular-nums">{schedule}</span>}
          </div>
        </div>
        <ChevronRight className="mt-2 size-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>

      {confirmed && card.result ? (
        <div id={`${statusId}-detail`} className="mt-4 rounded-xl bg-success px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-success-ink">
            <CircleCheck className="size-3.5" aria-hidden />
            확정 · {modeLabel(card.result.mode)}
          </p>
          <p className="mt-0.5 truncate text-base font-bold">{card.result.candidate.name}</p>
          <p className="text-sm text-ink-soft">{formatCost(card.result.candidate.cost, card.result.candidate.costNote)}</p>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-cream px-3 py-2">
              <dt className="text-xs text-ink-soft">후보</dt>
              <dd className="font-bold tabular-nums">{card.candidates.length}개</dd>
            </div>
            <div className="rounded-xl bg-cream px-3 py-2">
              <dt className="text-xs text-ink-soft">의견 투표</dt>
              <dd className="font-bold tabular-nums">
                {ready}/{total}명 제출
              </dd>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-deep" aria-hidden>
                <div className="h-full rounded-full bg-coral transition-[width] duration-500" style={{ width: `${total ? (ready / total) * 100 : 0}%` }} />
              </div>
            </div>
          </dl>
          <p
            id={`${statusId}-detail`}
            className={cn("mt-3 text-sm", step.action ? "font-bold text-[#b9412c]" : "font-medium text-ink-soft")}
          >
            {step.text}
          </p>
        </>
      )}
    </article>
  );
}
