"use client";

import { CalendarCheck, CircleCheck, Crown, ExternalLink, PartyPopper } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { IssueHint } from "@/components/room/IssueHint";
import { ReasonList } from "@/components/room/ReasonList";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/StatusBadge";
import { TasteTags } from "@/components/ui/TasteChip";
import { formatCost } from "@/lib/client/format";
import { modeLabel } from "@/lib/domain/constants";
import type { DecisionCardView, DecisionResult } from "@/lib/domain/types";

/** 세 결정 방식이 함께 쓰는 결과 공개 화면 */
export function ResultReveal({ card, result }: { card: DecisionCardView; result: DecisionResult }) {
  const { view, act } = useRoom();
  const [confirming, setConfirming] = useState(false);
  const confirmed = card.stage === "confirmed";
  const fromTie = result.detail.kind === "roulette" && result.detail.fromTie;

  const confirm = async () => {
    setConfirming(true);
    await act({ type: "confirmResult", cardId: card.id });
    setConfirming(false);
  };

  return (
    <div className="space-y-3">
      <section className="animate-rise-in overflow-hidden rounded-[var(--radius-card)] bg-white" aria-live="polite">
        <div className={confirmed ? "bg-success px-5 py-4" : "bg-coral-soft px-5 py-4"}>
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
            {confirmed ? <CalendarCheck className="size-4 text-success-ink" aria-hidden /> : <PartyPopper className="size-4 text-coral-strong" aria-hidden />}
            {confirmed ? "여행 보드에 확정됐어요" : `${card.title} 최종 결정`}
          </p>
          <h3 className="mt-1 text-2xl leading-tight font-extrabold break-words md:text-[28px]">{result.candidate.name}</h3>
          <p className="mt-1 font-semibold text-ink-soft">{formatCost(result.candidate.cost, result.candidate.costNote)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone={confirmed ? "success" : "coral"} className="bg-white">
              {modeLabel(result.mode)}
              {fromTie ? " · 동점 룰렛" : ""}
            </Pill>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          <TasteTags tags={result.candidate.tags} />
          <IssueHint evaluation={card.evaluations.find((e) => e.candidateId === result.candidate.id)} className="text-sm" />
          {result.candidate.description && <p className="text-sm">{result.candidate.description}</p>}
          <div>
            <p className="mb-1.5 text-sm font-bold">선택 이유</p>
            <ReasonList reasons={result.reasons.map((text) => ({ tone: "good" as const, text }))} />
          </div>
          <ResultDetailView result={result} />
          {result.candidate.link && (
            <a href={result.candidate.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-info-ink">
              <ExternalLink className="size-4" aria-hidden /> 지도·참고 링크 열기
            </a>
          )}
        </div>
      </section>

      {!confirmed &&
        (view.me.isHost ? (
          <Button size="lg" variant="success" block loading={confirming} icon={<CircleCheck className="size-5" aria-hidden />} onClick={confirm}>
            여행 보드에 확정하기
          </Button>
        ) : (
          <p className="rounded-xl bg-white px-4 py-3 text-center text-sm text-ink-soft">방장이 확정하면 여행 보드에 반영돼요.</p>
        ))}
    </div>
  );
}

function ResultDetailView({ result }: { result: DecisionResult }) {
  const d = result.detail;
  if (d.kind === "vote") {
    const max = Math.max(1, ...d.counts.map((c) => c.votes));
    return (
      <div>
        <p className="mb-1.5 text-sm font-bold">득표 결과 ({d.totalVoters}명 참여)</p>
        <ul className="space-y-1.5">
          {d.counts.map((c) => (
            <li key={c.candidateId} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{c.name}</span>
                <span className="shrink-0 font-bold">{c.votes}표</span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-cream-deep" aria-hidden>
                <div className="h-full rounded-full bg-coral" style={{ width: `${(c.votes / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (d.kind === "roulette") {
    return (
      <p className="text-sm text-ink-soft">
        룰렛 후보 {d.pool.length}개: {d.pool.map((p) => p.name).join(" · ")} (모두 같은 확률)
      </p>
    );
  }
  if (d.kind === "marble") {
    return (
      <div>
        <p className="mb-1.5 text-sm font-bold">구슬 도착 순서</p>
        <ol className="space-y-1 text-sm">
          {d.order.map((o, i) => (
            <li key={o.candidateId} className="flex items-center gap-2">
              <span className="w-5 text-center font-bold text-ink-soft">{i + 1}</span>
              <span className="flex-1 truncate">{o.name}</span>
              {i === 0 && <Crown className="size-4 text-[#B7860B]" aria-label="1등" />}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold">연타 순위</p>
      <ol className="space-y-1 text-sm">
        {d.ranking.map((r, i) => (
          <li key={r.memberId} className="flex items-center gap-2">
            <span className="w-5 text-center font-bold text-ink-soft">{i + 1}</span>
            <span className="flex-1 truncate">{r.nickname}</span>
            {r.memberId === d.winnerMemberId && <Crown className="size-4 text-[#B7860B]" aria-label="결정권자" />}
            <span className="font-bold">{r.taps}회</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
