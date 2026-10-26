"use client";

import { CalendarCheck, ExternalLink, Wallet } from "lucide-react";
import { TasteTags } from "@/components/ui/TasteChip";
import { formatCost, formatWon } from "@/lib/client/format";
import { modeLabel } from "@/lib/domain/constants";
import { CardIcon } from "./DecisionCard";
import { useRoom } from "./RoomProvider";

/** 확정된 결정만 모아 보는 여행 보드 */
export function ConfirmedPlan({ onOpenCard }: { onOpenCard: (cardId: string) => void }) {
  const { view, justConfirmed } = useRoom();
  const confirmed = view.cards.filter((c) => c.stage === "confirmed" && c.result);
  const knownCosts = confirmed.map((c) => c.result!.candidate.cost).filter((v): v is number => v !== null);
  const total = knownCosts.reduce((a, b) => a + b, 0);
  const unknown = confirmed.length - knownCosts.length;

  return (
    <section aria-labelledby="plan-title" className="rounded-[var(--radius-card)] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="plan-title" className="flex items-center gap-2 text-lg font-bold">
          <CalendarCheck className="size-5 text-success-ink" aria-hidden />
          확정된 일정
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
      ) : (
        <>
          <ol className="mt-3 space-y-2">
            {confirmed.map((card) => {
              const r = card.result!;
              return (
                <li key={card.id} className={justConfirmed === card.id ? "animate-pop" : undefined}>
                  <button
                    type="button"
                    onClick={() => onOpenCard(card.id)}
                    className="flex w-full gap-3 rounded-xl border border-line p-3 text-left hover:border-ink-faint"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success text-success-ink">
                      <CardIcon title={card.title} category={card.category} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-ink-soft">
                        {card.title} · {modeLabel(r.mode)}
                      </span>
                      <span className="block truncate font-bold">{r.candidate.name}</span>
                      <span className="block text-sm text-ink-soft">{formatCost(r.candidate.cost)}</span>
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
                </li>
              );
            })}
          </ol>
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
