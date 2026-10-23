"use client";

import { ArrowDown, ArrowUp, Sparkles, X } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TASTE_ICON, TasteChip } from "@/components/ui/TasteChip";
import { cn } from "@/lib/client/cn";
import { TASTES, tasteLabel, type TasteKey } from "@/lib/domain/constants";
import { tasteTitle } from "@/lib/domain/evaluate";
import type { TasteRanks } from "@/lib/domain/types";
import { useRoom } from "./RoomProvider";

const RANK_LABEL = ["1순위", "2순위", "3순위"];

/** 7개 취향 중 3개를 중복 없이 순서대로 고른다. 순서는 위·아래 버튼으로 언제든 바꿀 수 있다. */
export function TasteRankPicker({ value, onChange }: { value: TasteKey[]; onChange: (v: TasteKey[]) => void }) {
  const toggle = (key: TasteKey) => {
    if (value.includes(key)) onChange(value.filter((k) => k !== key));
    else if (value.length < 3) onChange([...value, key]);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <ol className="space-y-2" aria-label="선택한 순위">
        {[0, 1, 2].map((i) => {
          const key = value[i];
          const Icon = key ? TASTE_ICON[key] : null;
          return (
            <li
              key={i}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-xl border px-3",
                key ? "border-coral bg-white" : "border-dashed border-line bg-white/50",
              )}
            >
              <span
                className={cn(
                  "flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-extrabold",
                  key ? "bg-coral-strong text-white" : "bg-cream-deep text-ink-faint",
                )}
              >
                {RANK_LABEL[i]}
              </span>
              {key && Icon ? (
                <>
                  <span className="flex min-w-0 flex-1 items-center gap-2 font-bold">
                    <Icon className="size-5 shrink-0 text-coral-strong" aria-hidden />
                    <span className="truncate">{tasteLabel(key)}</span>
                  </span>
                  <span className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-cream disabled:opacity-30"
                      aria-label={`${tasteLabel(key)} 순위 올리기`}
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === value.length - 1}
                      className="flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-cream disabled:opacity-30"
                      aria-label={`${tasteLabel(key)} 순위 내리기`}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-cream"
                      aria-label={`${tasteLabel(key)} 선택 해제`}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </span>
                </>
              ) : (
                <span className="text-sm text-ink-faint">아래에서 골라주세요</span>
              )}
            </li>
          );
        })}
      </ol>

      <div>
        <p className="mb-2 text-sm font-bold">
          여행에서 중요한 것 <span className="font-normal text-ink-soft">({value.length}/3)</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TASTES.map((t) => {
            const Icon = TASTE_ICON[t.key];
            const rank = value.indexOf(t.key);
            const selected = rank >= 0;
            const full = !selected && value.length >= 3;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={selected}
                disabled={full}
                onClick={() => toggle(t.key)}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm font-semibold transition-colors",
                  selected ? "border-coral-strong bg-coral-soft text-[#b9412c]" : "border-line bg-white hover:border-ink-faint",
                  full && "opacity-40",
                )}
              >
                {selected && (
                  <span className="absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-coral-strong text-[11px] font-extrabold text-white">
                    {rank + 1}
                  </span>
                )}
                <Icon className="size-5" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
        {value.length >= 3 && <p className="mt-2 text-xs text-ink-soft">다른 항목을 고르려면 위에서 하나를 빼주세요.</p>}
      </div>
    </div>
  );
}

/** 보드의 내 취향 카드. 편집 시트 열림 상태는 보드가 관리한다(하단 버튼에서도 열 수 있게). */
export function TastePanel({ editorOpen, onEditorOpenChange }: { editorOpen: boolean; onEditorOpenChange: (open: boolean) => void }) {
  const { view } = useRoom();
  const taste = view.me.taste;

  return (
    <section aria-labelledby="taste-title" className="rounded-[var(--radius-card)] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="taste-title" className="text-lg font-bold">
          내 여행 취향
        </h2>
        {taste && (
          <Button size="sm" variant="ghost" onClick={() => onEditorOpenChange(true)}>
            순서 바꾸기
          </Button>
        )}
      </div>
      {taste ? (
        <div className="mt-2">
          <p className="flex items-center gap-1.5 text-sm font-bold text-coral-strong">
            <Sparkles className="size-4" aria-hidden />
            {tasteTitle(taste)}
          </p>
          <div key={taste.join()} className="mt-2 flex flex-wrap gap-1.5">
            {taste.map((t, i) => (
              <TasteChip
                key={t}
                taste={t}
                rank={i + 1}
                className="animate-gather"
                // 태그가 양옆에서 가운데로 모이는 짧은 전환
                style={{ "--from-x": `${(1 - i) * 24}px`, animationDelay: `${i * 70}ms` } as CSSProperties}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2 rounded-xl bg-coral-soft p-3">
          <p className="text-sm font-bold">가장 중요한 세 가지를 순서대로 골라주세요.</p>
          <p className="mt-0.5 text-sm text-ink-soft">후보 추천에 1순위 3점, 2순위 2점, 3순위 1점으로 반영돼요.</p>
          <Button className="mt-3" block onClick={() => onEditorOpenChange(true)}>
            내 취향 고르기
          </Button>
        </div>
      )}

      {editorOpen && <TasteEditor onClose={() => onEditorOpenChange(false)} />}
    </section>
  );
}

function TasteEditor({ onClose }: { onClose: () => void }) {
  const { view, act } = useRoom();
  const [draft, setDraft] = useState<TasteKey[]>(() => (view.me.taste ? [...view.me.taste] : []));
  const [saving, setSaving] = useState(false);
  const preview = draft.length === 3 ? tasteTitle(draft as TasteRanks) : null;

  const save = async () => {
    if (draft.length !== 3) return;
    setSaving(true);
    const ok = await act({ type: "setTaste", ranks: draft as TasteRanks });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="내 여행 취향 고르기"
      subtitle="중복 없이 3가지를 순서대로 골라주세요."
      footer={
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-coral-strong">{preview ? `나는 ${preview}` : `${3 - draft.length}개 더 골라주세요`}</p>
          <Button size="lg" disabled={draft.length !== 3} loading={saving} onClick={save}>
            저장하기
          </Button>
        </div>
      }
    >
      <TasteRankPicker value={draft} onChange={setDraft} />
    </Sheet>
  );
}
