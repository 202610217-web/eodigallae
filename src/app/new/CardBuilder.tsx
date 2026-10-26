"use client";

import { LayoutList, Plus, X } from "lucide-react";
import { createElement, useState } from "react";
import { CARD_ICON_COMPONENT } from "@/components/room/DecisionCard";
import { ScheduleFields } from "@/components/room/ScheduleFields";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";
import { cn } from "@/lib/client/cn";
import {
  CARD_ICONS,
  CARD_ICON_KEYS,
  CATEGORY_LABEL,
  guessCardIcon,
  guessCardTime,
  type CardCategory,
  type CardIconKey,
} from "@/lib/domain/constants";

export interface CardDraft {
  id: string;
  title: string;
  icon: CardIconKey;
  day: number | null;
  time: string | null;
}

export const MAX_CARDS = 8;
const CATEGORY_ORDER: CardCategory[] = ["meal", "activity", "stay"];

/** 방장이 결정 카드를 직접 만든다: 이름 + 아이콘(아이콘 종류가 곧 식사·활동·숙소) + 일차·시간 */
export function CardBuilder({
  cards,
  onChange,
  dayCount,
  tripStart,
}: {
  cards: CardDraft[];
  onChange: (cards: CardDraft[]) => void;
  dayCount: number;
  tripStart: string;
}) {
  const [title, setTitle] = useState("");
  // 직접 고른 아이콘. 고르기 전에는 이름으로 추측한 아이콘을 미리 선택해 둔다
  const [picked, setPicked] = useState<CardIconKey | null>(null);
  const icon = picked ?? guessCardIcon(title);
  const full = cards.length >= MAX_CARDS;

  const add = () => {
    const t = title.trim();
    if (!t || !icon || full) return;
    onChange([...cards, { id: `card-${Date.now()}`, title: t, icon, day: 1, time: guessCardTime(t) }]);
    setTitle("");
    setPicked(null);
  };

  const update = (id: string, patch: Partial<CardDraft>) => onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-4">
      {cards.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-line px-4 py-4 text-sm text-ink-soft">
          <LayoutList className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>아직 만든 결정 카드가 없어요. 아래에서 함께 정할 항목(예: 점심 식사, 오후 활동, 숙소)을 만들어주세요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cards.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-cream p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-ink">
                  {createElement(CARD_ICON_COMPONENT[c.icon], { className: "size-5", "aria-hidden": true })}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{c.title}</span>
                <span className="shrink-0 text-xs text-ink-soft">{CATEGORY_LABEL[CARD_ICONS[c.icon].category]}</span>
                <button
                  type="button"
                  onClick={() => onChange(cards.filter((x) => x.id !== c.id))}
                  className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-deep"
                  aria-label={`${c.title} 삭제`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <ScheduleFields
                idPrefix={c.id}
                className="mt-2"
                day={c.day === null ? null : Math.min(c.day, dayCount)}
                time={c.time}
                dayCount={dayCount}
                tripStart={tripStart || undefined}
                onChange={(s) => update(c.id, s)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl bg-cream p-3">
        <Label htmlFor="new-card-title" hint={`${cards.length}/${MAX_CARDS}개`}>
          결정 카드 만들기
        </Label>
        <div className="flex gap-2">
          <TextInput
            id="new-card-title"
            maxLength={20}
            placeholder="예: 점심 식사, 오후 활동, 숙소"
            value={title}
            disabled={full}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button variant="secondary" size="lg" className="shrink-0" icon={<Plus className="size-4" aria-hidden />} onClick={add} disabled={!title.trim() || !icon || full}>
            추가
          </Button>
        </div>

        <div className="mt-3">
          <p className="mb-2 text-sm font-bold">
            아이콘
            <span className="ml-2 text-xs font-medium text-ink-soft">
              {icon ? `${CARD_ICONS[icon].label} · ${CATEGORY_LABEL[CARD_ICONS[icon].category]} 카드` : "아이콘을 골라주세요"}
            </span>
          </p>
          <div className="space-y-2">
            {CATEGORY_ORDER.map((category) => (
              <div key={category} className="flex items-start gap-1.5">
                <span className="w-9 shrink-0 pt-3 text-xs font-semibold text-ink-soft">{CATEGORY_LABEL[category]}</span>
                <div role="radiogroup" aria-label={`${CATEGORY_LABEL[category]} 아이콘`} className="flex flex-wrap gap-1.5">
                  {CARD_ICON_KEYS.filter((k) => CARD_ICONS[k].category === category).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={icon === k}
                      aria-label={CARD_ICONS[k].label}
                      title={CARD_ICONS[k].label}
                      onClick={() => setPicked(k)}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl border-2 bg-white transition-colors",
                        icon === k ? "border-coral-strong text-coral-strong" : "border-transparent text-ink-soft hover:border-line",
                      )}
                    >
                      {createElement(CARD_ICON_COMPONENT[k], { className: "size-5", "aria-hidden": true })}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">고른 아이콘에 따라 친구들이 입력할 조건이 달라져요 (식사: 못 먹는 음식 · 활동: 참여하기 어려운 활동 · 숙소: 숙소 조건).</p>
        </div>
      </div>
    </div>
  );
}
