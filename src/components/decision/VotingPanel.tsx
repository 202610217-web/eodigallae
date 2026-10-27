"use client";

import { CircleCheck, Dices, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Button } from "@/components/ui/Button";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import { Notice } from "@/components/ui/States";
import { TasteTags } from "@/components/ui/TasteChip";
import { cn } from "@/lib/client/cn";
import { formatCost } from "@/lib/client/format";
import type { DecisionCardView } from "@/lib/domain/types";

export function VotingPanel({ card }: { card: DecisionCardView }) {
  const { view, act } = useRoom();
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const voting = card.voting!;
  const pool = card.pool.map((id) => card.candidates.find((c) => c.id === id)).filter((c) => c !== undefined);
  const myVote = voting.myVoteCandidateId;
  const progress = voting.eligibleVoters ? (voting.votedCount / voting.eligibleVoters) * 100 : 0;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  if (card.phase === "tallying") {
    return (
      <div role="status" className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] bg-white p-8 font-semibold">
        <LoaderCircle className="size-5 animate-spin text-coral" aria-hidden /> 표를 세고 있어요
      </div>
    );
  }

  if (card.phase === "tie") {
    const counts = voting.counts ?? [];
    return (
      <div className="space-y-3">
        <Notice tone="warning" icon={<Dices className="size-5" aria-hidden />} title="동점이에요! 룰렛으로 결정할까요?">
          동점 후보 {card.tieCandidateIds.length}개만 룰렛에 넣고, 모두 같은 확률로 돌려요.
        </Notice>
        <ul className="space-y-2 rounded-[var(--radius-card)] bg-white p-4">
          {counts.map((c) => {
            const name = card.candidates.find((x) => x.id === c.candidateId)?.name ?? "후보";
            const tied = card.tieCandidateIds.includes(c.candidateId);
            return (
              <li key={c.candidateId} className={cn("flex justify-between gap-2 text-sm", tied ? "font-bold" : "text-ink-soft")}>
                <span className="truncate">{name}</span>
                <span className="shrink-0">{c.votes}표{tied && " · 동점"}</span>
              </li>
            );
          })}
        </ul>
        {view.me.isHost ? (
          <Button size="lg" block loading={busy} icon={<Dices className="size-5" aria-hidden />} onClick={() => run(() => act({ type: "startTieRoulette", cardId: card.id }))}>
            동점 후보로 룰렛 돌리기
          </Button>
        ) : (
          <p className="text-center text-sm text-ink-soft">방장이 룰렛을 준비하고 있어요.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>투표 참여</span>
          <span>
            {voting.votedCount}/{voting.eligibleVoters}명
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-deep" aria-hidden>
          <div className="h-full rounded-full bg-coral transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
          <EyeOff className="size-3.5" aria-hidden /> 마감 전에는 누가 어디에 투표했는지, 후보별 득표수를 보여주지 않아요.
        </p>
      </div>

      {myVote ? (
        <Notice tone="success" icon={<CircleCheck className="size-5 animate-pop" aria-hidden />} title="투표 완료!">
          내 선택: <strong>{card.candidates.find((c) => c.id === myVote)?.name}</strong> · 결과는 마감 후 공개돼요.
        </Notice>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-bold">한 곳에 투표해주세요 (한 번만 가능)</legend>
          {pool.map((c) => (
            <label
              key={c.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border-2 bg-white p-4",
                choice === c.id ? "border-coral-strong" : "border-transparent",
              )}
            >
              <input type="radio" name={`vote-${card.id}`} className="mt-1 size-5 accent-coral-strong" checked={choice === c.id} onChange={() => setChoice(c.id)} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold break-words">{c.name}</span>
                <span className="block text-sm text-ink-soft">{formatCost(c.cost, c.notes.cost)}</span>
                <TasteTags tags={c.tags} className="mt-1.5" />
              </span>
            </label>
          ))}
          <Button size="lg" block disabled={!choice} loading={busy} onClick={() => choice && run(() => act({ type: "castVote", cardId: card.id, candidateId: choice }))}>
            투표하기
          </Button>
        </fieldset>
      )}

      {view.me.isHost && (
        <Button
          variant="secondary"
          size="lg"
          block
          loading={busy && !!myVote}
          onClick={async () => {
            const left = voting.eligibleVoters - voting.votedCount;
            if (
              left > 0 &&
              !(await confirmDialog({
                title: "지금 투표를 마감할까요?",
                description: `아직 ${left}명이 투표하지 않았어요. 마감하면 지금까지의 표로 결과를 정해요.`,
                confirmLabel: "마감하기",
              }))
            )
              return;
            void run(() => act({ type: "closeVote", cardId: card.id }));
          }}
        >
          투표 마감하고 결과 보기
        </Button>
      )}
    </div>
  );
}
