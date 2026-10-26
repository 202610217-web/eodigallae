"use client";

import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { DecisionFlow } from "@/components/decision/DecisionFlow";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/client/cn";
import { myCondition } from "@/lib/client/selectors";
import { CATEGORY_LABEL } from "@/lib/domain/constants";
import type { DecisionCardView } from "@/lib/domain/types";
import { CandidateForm } from "./CandidateForm";
import { CandidateList } from "./CandidateList";
import { ConditionForm } from "./ConditionForm";
import { useRoom } from "./RoomProvider";

export type DetailTab = "conditions" | "candidates" | "decision";

export function defaultTab(card: DecisionCardView, meId: string): DetailTab {
  if (card.stage !== "open") return "decision";
  if (!myCondition(card, meId)?.ready && !card.locked) return "conditions";
  return "candidates";
}

function lockReason(card: DecisionCardView): string | null {
  if (card.stage === "confirmed") return "이미 확정된 카드예요. 방장이 ‘다시 정하기’를 누르면 수정할 수 있어요.";
  if (card.stage === "deciding") return "결정이 진행 중이라 후보와 조건이 잠겨 있어요.";
  if (card.locked) return "방장이 이 카드를 잠갔어요. 잠금이 풀리면 수정할 수 있어요.";
  return null;
}

export function CardDetail({ card, initialTab, onClose }: { card: DecisionCardView; initialTab: DetailTab; onClose: () => void }) {
  const { view, act } = useRoom();
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [addOpen, setAddOpen] = useState(false);
  const [locking, setLocking] = useState(false);
  const reason = lockReason(card);
  const editable = reason === null;
  const passCount = card.evaluations.filter((e) => e.state === "pass").length;

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "conditions", label: "내 조건" },
    { key: "candidates", label: `후보 ${card.candidates.length}` },
    { key: "decision", label: card.stage === "confirmed" ? "결과" : "결정" },
  ];

  const toggleLock = async () => {
    setLocking(true);
    await act({ type: "setLock", cardId: card.id, locked: !card.locked });
    setLocking(false);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="wide"
      title={card.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={card.status} />
          <span>
            {CATEGORY_LABEL[card.category]} · 후보 {card.candidates.length}개 · 통과 {passCount}개
          </span>
        </span>
      }
      headerExtra={
        view.me.isHost && card.stage === "open" ? (
          <Button
            size="sm"
            variant="secondary"
            className="mt-1.5"
            loading={locking}
            icon={card.locked ? <LockOpen className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
            onClick={toggleLock}
          >
            {card.locked ? "잠금 해제" : "잠그기"}
          </Button>
        ) : undefined
      }
    >
      <div role="tablist" aria-label="카드 상세" className="sticky -top-4 z-10 -mx-4 mb-4 grid grid-cols-3 gap-1 bg-cream px-4 pt-1 pb-3 md:-mx-6 md:px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-11 rounded-xl text-sm font-bold transition-colors",
              tab === t.key ? "bg-ink text-white" : "bg-white text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "conditions" && <ConditionForm key={card.id} card={card} editable={editable} lockedReason={reason} />}
        {tab === "candidates" && <CandidateList card={card} editable={editable} onEditConditions={() => setTab("conditions")} />}
        {tab === "decision" && (
          <DecisionFlow
            card={card}
            onAddCandidate={() => {
              setTab("candidates");
              if (editable) setAddOpen(true);
            }}
          />
        )}
      </div>

      {addOpen && <CandidateForm open onClose={() => setAddOpen(false)} card={card} editing={null} />}
    </Sheet>
  );
}
