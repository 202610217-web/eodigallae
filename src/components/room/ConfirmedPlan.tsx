"use client";

import { BedDouble, CalendarCheck, ExternalLink, Wallet } from "lucide-react";
import { TasteTags } from "@/components/ui/TasteChip";
import { cn } from "@/lib/client/cn";
import { formatCost, formatDayDate, formatWon } from "@/lib/client/format";
import { modeLabel } from "@/lib/domain/constants";
import type { DecisionCardView } from "@/lib/domain/types";
import { CardIcon } from "./DecisionCard";
import { useRoom } from "./RoomProvider";

type ConfirmedCard = DecisionCardView & { result: NonNullable<DecisionCardView["result"]> };

/** 일정표 순서: 일차 → 시작 시각 → 카드 순서. 일차·시간이 비어 있으면 뒤로 */
function byTime(a: ConfirmedCard, b: ConfirmedCard): number {
  return (a.day ?? 99) - (b.day ?? 99) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.sortOrder - b.sortOrder;
}

/** 확정된 결정만 모아 보는 여행 보드. 모든 카드가 확정되면 숙소를 뺀 식사·활동을 시간순 일정표로 보여준다. */
export function ConfirmedPlan({ onOpenCard }: { onOpenCard: (cardId: string) => void }) {
  const { view } = useRoom();
  const confirmed = view.cards.filter((c): c is ConfirmedCard => c.stage === "confirmed" && c.result !== null);
  const allConfirmed = confirmed.length > 0 && confirmed.length === view.cards.length;
  const knownCosts = confirmed.map((c) => c.result.candidate.cost).filter((v): v is number => v !== null);
  const total = knownCosts.reduce((a, b) => a + b, 0);
  const unknown = confirmed.length - knownCosts.length;

  return (
    <section aria-labelledby="plan-title" className="rounded-[var(--radius-card)] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="plan-title" className="flex items-center gap-2 text-lg font-bold">
          <CalendarCheck className="size-5 text-success-ink" aria-hidden />
          {allConfirmed ? "여행 일정표" : "확정된 일정"}
        </h2>
        <span className="text-sm font-semibold text-ink-soft">
          {confirmed.length}/{view.cards.length}
        </span>
      </div>

      {confirmed.length === 0 ? (
        <p className="mt-3 rounded-xl bg-cream px-3 py-4 text-center text-sm text-ink-soft">
          아직 확정된 일정이 없어요.
          <br />
          결정 카드에서 후보를 모으고 함께 정해보세요.
        </p>
      ) : allConfirmed ? (
        <Timeline cards={confirmed} onOpenCard={onOpenCard} />
      ) : (
        <ol className="mt-3 space-y-2">
          {confirmed.map((card) => (
            <li key={card.id}>
              <PlanItem card={card} onOpenCard={onOpenCard} />
            </li>
          ))}
        </ol>
      )}

      {confirmed.length > 0 && (
        <>
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-cream px-3 py-2 text-sm">
            <Wallet className="size-4 text-ink-soft" aria-hidden />
            확정 일정 예상 합계 <strong className="ml-auto">1인 {formatWon(total)}</strong>
          </p>
          {unknown > 0 && <p className="mt-1 text-xs text-ink-soft">비용 미확인 {unknown}건은 합계에서 빠졌어요.</p>}
        </>
      )}
    </section>
  );
}

function Timeline({ cards, onOpenCard }: { cards: ConfirmedCard[]; onOpenCard: (cardId: string) => void }) {
  const { view } = useRoom();
  const scheduled = cards.filter((c) => c.category !== "stay").sort(byTime);
  const stays = cards.filter((c) => c.category === "stay").sort(byTime);
  const days = [...new Set(scheduled.map((c) => c.day))];

  return (
    <div className="mt-3 space-y-4">
      {scheduled.length === 0 && <p className="text-sm text-ink-soft">식사·활동 일정이 없어요.</p>}
      {days.map((day) => (
        <div key={day ?? "none"}>
          <h3 className="mb-2 text-sm font-bold">
            {day ? (
              <>
                {day}일차 <span className="font-medium text-ink-soft">· {formatDayDate(view.tripStart, day)}</span>
              </>
            ) : (
              <span className="text-ink-soft">일차 미정</span>
            )}
          </h3>
          <ol className="relative space-y-2 border-l-2 border-line pl-4">
            {scheduled
              .filter((c) => c.day === day)
              .map((card) => (
                <li key={card.id} className="relative">
                  <span className="absolute top-4 -left-[23px] size-3 rounded-full border-2 border-white bg-coral" aria-hidden />
                  <PlanItem card={card} onOpenCard={onOpenCard} timeLabel={card.time ?? "시간 미정"} />
                </li>
              ))}
          </ol>
        </div>
      ))}

      {stays.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <BedDouble className="size-4 text-ink-soft" aria-hidden /> 숙소
          </h3>
          <ol className="space-y-2">
            {stays.map((card) => (
              <li key={card.id}>
                <PlanItem card={card} onOpenCard={onOpenCard} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function PlanItem({ card, onOpenCard, timeLabel }: { card: ConfirmedCard; onOpenCard: (cardId: string) => void; timeLabel?: string }) {
  const { justConfirmed } = useRoom();
  const r = card.result;
  return (
    <div className={justConfirmed === card.id ? "animate-pop" : undefined}>
      <button
        type="button"
        onClick={() => onOpenCard(card.id)}
        className="flex w-full gap-3 rounded-xl border border-line p-3 text-left hover:border-ink-faint"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success text-success-ink">
          <CardIcon icon={card.icon} title={card.title} category={card.category} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-ink-soft">
            {timeLabel && <span className={cn("mr-1.5 font-bold", card.time ? "text-coral-strong" : "text-ink-faint")}>{timeLabel}</span>}
            {card.title} · {modeLabel(r.mode)}
          </span>
          <span className="block truncate font-bold">{r.candidate.name}</span>
          <span className="block text-sm text-ink-soft">{formatCost(r.candidate.cost, r.candidate.costNote)}</span>
          <TasteTags tags={r.candidate.tags} className="mt-1.5" />
        </span>
      </button>
      {r.candidate.link && (
        <a
          href={r.candidate.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-9 items-center gap-1 px-1 text-sm font-semibold text-info-ink"
        >
          <ExternalLink className="size-3.5" aria-hidden /> 지도·참고 링크
        </a>
      )}
    </div>
  );
}
