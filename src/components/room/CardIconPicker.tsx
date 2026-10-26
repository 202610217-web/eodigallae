"use client";

import { createElement } from "react";
import { cn } from "@/lib/client/cn";
import { CARD_CATEGORIES, CARD_ICONS, CARD_ICON_KEYS, CATEGORY_LABEL, type CardIconKey } from "@/lib/domain/constants";
import { CARD_ICON_COMPONENT } from "./DecisionCard";

/** 결정 카드 아이콘 고르기 (장식용). 보기 편하게 식사·활동·숙소 묶음으로 나눠 보여준다. */
export function CardIconPicker({ value, onChange, label = "아이콘" }: { value: CardIconKey | null; onChange: (icon: CardIconKey) => void; label?: string }) {
  return (
    <div className="space-y-2">
      {CARD_CATEGORIES.map((category) => (
        <div key={category} className="flex items-start gap-1.5">
          <span className="w-9 shrink-0 pt-3 text-xs font-semibold text-ink-soft">{CATEGORY_LABEL[category]}</span>
          <div role="radiogroup" aria-label={`${label}: ${CATEGORY_LABEL[category]}`} className="flex flex-wrap gap-1.5">
            {CARD_ICON_KEYS.filter((k) => CARD_ICONS[k].category === category).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={value === k}
                aria-label={CARD_ICONS[k].label}
                title={CARD_ICONS[k].label}
                onClick={() => onChange(k)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl border-2 bg-white transition-colors",
                  value === k ? "border-coral-strong text-coral-strong" : "border-transparent text-ink-soft hover:border-line",
                )}
              >
                {createElement(CARD_ICON_COMPONENT[k], { className: "size-5", "aria-hidden": true })}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
