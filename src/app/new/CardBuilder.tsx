"use client";

import { ChevronDown, LayoutList, MessageSquareText, Plus, X } from "lucide-react";
import { createElement, useState } from "react";
import { CardIconPicker } from "@/components/room/CardIconPicker";
import { CARD_ICON_COMPONENT } from "@/components/room/DecisionCard";
import { newQuestionDraft, QuestionFields, toQuestionInputs, type QuestionDraft } from "@/components/room/QuestionFields";
import { ScheduleFields } from "@/components/room/ScheduleFields";
import { Button } from "@/components/ui/Button";
import { Label, Segmented, TextInput } from "@/components/ui/Field";
import { cn } from "@/lib/client/cn";
import {
  CARD_CATEGORIES,
  CARD_ICONS,
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
  category: CardCategory;
  day: number | null;
  time: string | null;
  /** 이 카드에서 친구들에게 물어볼 의견 투표 질문 (방장이 직접 만든다) */
  questions: QuestionDraft[];
}

export const MAX_CARDS = 8;
const CATEGORY_OPTIONS = CARD_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABEL[key] }));

/**
 * 방장이 결정 카드를 직접 만든다: 이름 + 아이콘(장식) + 종류 + 일차·시간 + 의견 투표 질문.
 * 종류는 확정 일정표에서 숙소를 따로 보여줄 때만 쓴다. 질문은 카드마다 방장이 이름과 보기를 직접 적는다.
 */
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
  // 종류를 직접 고르기 전에는 아이콘 묶음을 기본값으로 보여준다 (아이콘을 바꿔도 직접 고른 종류는 그대로)
  const [pickedCategory, setPickedCategory] = useState<CardCategory | null>(null);
  const category = pickedCategory ?? (icon ? CARD_ICONS[icon].category : "activity");
  const full = cards.length >= MAX_CARDS;
  // 질문 입력칸을 펼친 카드 (새로 추가한 카드는 바로 질문을 적을 수 있게 펼친다)
  const [openId, setOpenId] = useState<string | null>(null);

  const add = () => {
    const t = title.trim();
    if (!t || !icon || full) return;
    const id = `card-${Date.now()}`;
    onChange([...cards, { id, title: t, icon, category, day: 1, time: guessCardTime(t), questions: [newQuestionDraft()] }]);
    setOpenId(id);
    setTitle("");
    setPicked(null);
    setPickedCategory(null);
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
                <span className="shrink-0 text-xs text-ink-soft">{CATEGORY_LABEL[c.category]}</span>
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
              <CardQuestions card={c} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} onChange={(questions) => update(c.id, { questions })} />
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
            <span className="ml-2 text-xs font-medium text-ink-soft">{icon ? CARD_ICONS[icon].label : "아이콘을 골라주세요"}</span>
          </p>
          <CardIconPicker value={icon} onChange={setPicked} label="새 카드 아이콘" />
        </div>

        <div className="mt-3">
          <p className="mb-2 text-sm font-bold">종류</p>
          <Segmented name="새 카드 종류" value={category} options={CATEGORY_OPTIONS} onChange={setPickedCategory} />
          <p className="mt-2 text-xs text-ink-soft">
            아이콘은 카드를 구분하는 장식이에요. 종류는 확정 일정표에서 숙소를 따로 모아 보여줄 때 써요. 카드를 추가하면 친구들에게 물어볼 질문을 카드마다 정할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  );
}

/** 카드 하나의 의견 투표 질문. 접어 두면 질문 이름만 보여준다 */
function CardQuestions({
  card,
  open,
  onToggle,
  onChange,
}: {
  card: CardDraft;
  open: boolean;
  onToggle: () => void;
  onChange: (questions: QuestionDraft[]) => void;
}) {
  const made = toQuestionInputs(card.questions);
  return (
    <div className="mt-3 border-t border-line pt-2">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-11 w-full items-center gap-2 text-left">
        <MessageSquareText className="size-4 shrink-0 text-ink-soft" aria-hidden />
        <span className="flex-1 text-sm font-bold">의견 투표 질문</span>
        <span className={cn("text-xs", made.length ? "font-semibold text-ink" : "text-ink-soft")}>{made.length ? `${made.length}개` : "아직 없음"}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-ink-soft transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="mt-1">
          <p className="mb-3 text-xs text-ink-soft">
            예: 예산, 메뉴, 피할 음식. 질문 이름과 보기를 직접 적어주세요. ‘기타(직접 입력)’는 모든 질문에 자동으로 들어가요. 비워 두면 모임 안에서 나중에 추가할 수 있어요.
          </p>
          <QuestionFields idPrefix={card.id} label={card.title} drafts={card.questions} onChange={onChange} />
        </div>
      ) : (
        made.length > 0 && <p className="truncate pb-1 text-sm text-ink-soft">{made.map((q) => q.title || "이름 없는 질문").join(" · ")}</p>
      )}
    </div>
  );
}
