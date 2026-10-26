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
import { createElement, type CSSProperties } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/client/cn";
import { formatCost, formatSchedule } from "@/lib/client/format";
import { cardReadyCount, myCondition } from "@/lib/client/selectors";
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

export function DecisionCard({ card, index, onOpen }: { card: DecisionCardView; index: number; onOpen: () => void }) {
  const { view, justConfirmed } = useRoom();
  const ready = cardReadyCount(card);
  const total = view.members.length;
  const mine = myCondition(card, view.me.id);
  const passCount = card.evaluations.filter((e) => e.state === "pass").length;
  const confirmed = card.stage === "confirmed" && card.result;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "stagger group flex min-h-44 w-full flex-col rounded-[var(--radius-card)] border bg-white p-4 text-left transition-colors hover:border-ink-faint",
        confirmed ? "border-[#bfe2cb]" : "border-transparent",
        justConfirmed === card.id && "animate-confirm",
      )}
      style={{ "--i": index } as CSSProperties}
      aria-label={`${card.title} 상세 열기`}
    >
      <div className="flex w-full items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-ink">
          <CardIcon icon={card.icon} title={card.title} category={card.category} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-lg font-bold leading-snug">
            <span className="truncate">{card.title}</span>
            {card.locked && <Lock className="size-4 shrink-0 text-ink-soft" aria-label="잠김" />}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={card.status} />
            {formatSchedule(card.day, card.time) && (
              <span className="text-xs font-semibold text-ink-soft">{formatSchedule(card.day, card.time)}</span>
            )}
          </div>
        </div>
        <ChevronRight className="mt-2 size-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>

      {confirmed && card.result ? (
        <div className="mt-4 rounded-xl bg-success px-3 py-2.5">
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
              <dd className="font-bold">
                {card.candidates.length}개
                {card.candidates.length > 0 && <span className="font-medium text-ink-soft"> · 통과 {passCount}</span>}
              </dd>
            </div>
            <div className="rounded-xl bg-cream px-3 py-2">
              <dt className="text-xs text-ink-soft">조건 입력</dt>
              <dd className="font-bold">
                {ready}/{total}명 준비 완료
              </dd>
            </div>
          </dl>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-deep" aria-hidden>
            <div className="h-full rounded-full bg-coral transition-[width] duration-500" style={{ width: `${total ? (ready / total) * 100 : 0}%` }} />
          </div>
          <p className="mt-3 text-sm font-medium text-ink-soft">
            {phaseText(card) ??
              (card.stage === "open" && !mine?.ready
                ? card.locked
                  ? "방장이 잠근 카드예요"
                  : "내 조건을 입력해주세요"
                : card.candidates.length === 0
                  ? "첫 번째 후보를 등록해주세요."
                  : "후보를 비교하고 결정 방식을 골라요")}
          </p>
        </>
      )}
    </button>
  );
}
