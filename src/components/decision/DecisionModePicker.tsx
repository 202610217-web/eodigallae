"use client";

import { ListChecks, Play, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { cn } from "@/lib/client/cn";
import { cardSubmittedCount } from "@/lib/client/selectors";
import type { DecisionMode } from "@/lib/domain/constants";
import type { DecisionCardView } from "@/lib/domain/types";
import { MODE_INFO } from "./modeInfo";

export { MODE_INFO };

/** 결정 방식 고르기 → 결정 시작. 등록된 후보가 모두 결정 대상이 된다. */
export function DecisionModePicker({
  card,
  onAddCandidate,
}: {
  card: DecisionCardView;
  onAddCandidate: () => void;
}) {
  const { view, act } = useRoom();
  const [mode, setMode] = useState<DecisionMode>("vote");
  const [starting, setStarting] = useState(false);
  const notSubmitted = view.members.length - cardSubmittedCount(card);
  const names = [...card.candidates].sort((a, b) => a.createdAt - b.createdAt).map((c) => c.name);

  if (card.candidates.length === 0) {
    return (
      <Notice tone="info" icon={<ListChecks className="size-5" aria-hidden />} title="아직 등록된 후보가 없어요.">
        <p>후보를 하나 이상 등록하면 결정을 시작할 수 있어요.</p>
        <Button className="mt-3" size="sm" icon={<Plus className="size-3.5" aria-hidden />} onClick={onAddCandidate}>
          후보 추가하기
        </Button>
      </Notice>
    );
  }

  if (!view.me.isHost) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-5 text-center">
        <p className="font-bold">방장이 결정 방식을 고르면 여기서 함께 진행해요.</p>
        <p className="mt-1 text-sm text-ink-soft">후보 {card.candidates.length}개 중에서 함께 골라요.</p>
      </div>
    );
  }

  const start = async () => {
    setStarting(true);
    await act({ type: "startDecision", cardId: card.id, mode, excludeIds: [] });
    setStarting(false);
  };

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="결정 방식" className="grid gap-2 md:grid-cols-2">
        {(Object.keys(MODE_INFO) as DecisionMode[]).map((key) => {
          const info = MODE_INFO[key];
          const Icon = info.icon;
          const selected = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(key)}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-card)] border-2 bg-white p-4 text-left transition-colors md:flex-col",
                selected ? "border-coral-strong" : "border-transparent hover:border-line",
              )}
            >
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", selected ? "bg-coral-strong text-white" : "bg-cream text-ink")}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-bold">{info.title}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{info.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <p className="text-sm font-bold">후보 {card.candidates.length}개</p>
        <p className="mt-1 text-sm text-ink-soft">{names.join(" · ")}</p>
        <p className="mt-2 text-xs text-ink-soft">결정 중에는 후보와 의견 투표가 잠겨요.</p>
      </div>

      {notSubmitted > 0 && (
        <Notice tone="warning" icon={<TriangleAlert className="size-5" aria-hidden />} title={`아직 ${notSubmitted}명이 의견을 제출하지 않았어요.`}>
          지금 시작하면 그 친구는 이번 결정 전에 의견을 낼 수 없어요.
        </Notice>
      )}

      <Button size="lg" block loading={starting} icon={<Play className="size-4" aria-hidden />} onClick={start}>
        {MODE_INFO[mode].title}로 결정 시작
      </Button>
    </div>
  );
}
