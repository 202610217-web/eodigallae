"use client";

import { Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_PROFILE, ProfileFields, type ProfileDraft } from "@/components/ProfileFields";
import { CardIcon } from "@/components/room/DecisionCard";
import { ScheduleFields } from "@/components/room/ScheduleFields";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { FieldError, Label, Segmented, TextInput } from "@/components/ui/Field";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { tripDayCount } from "@/lib/client/format";
import { CARD_PRESETS, CATEGORY_LABEL, LIMITS, guessCardTime, type CardCategory } from "@/lib/domain/constants";
import { createRoomSchema } from "@/lib/validation";

interface CardDraft {
  id: string;
  title: string;
  category: CardCategory;
  selected: boolean;
  custom: boolean;
  day: number | null;
  time: string | null;
}

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABEL) as CardCategory[]).map((key) => ({ key, label: CATEGORY_LABEL[key] }));

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span className="flex size-7 items-center justify-center rounded-full bg-ink text-sm text-white">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CreateRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tripStart, setTripStart] = useState("");
  const [tripEnd, setTripEnd] = useState("");
  const [cards, setCards] = useState<CardDraft[]>(() =>
    CARD_PRESETS.map((p) => ({ id: p.key, title: p.title, category: p.category, selected: true, custom: false, day: 1, time: guessCardTime(p.title) })),
  );
  const dayCount = tripDayCount(tripStart, tripEnd || null);
  const updateCard = (id: string, patch: Partial<CardDraft>) => setCards((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState<CardCategory>("activity");
  const [profile, setProfile] = useState<ProfileDraft>(DEFAULT_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    setCards((c) => [
      ...c,
      { id: `custom-${Date.now()}`, title, category: customCategory, selected: true, custom: true, day: 1, time: guessCardTime(title) },
    ]);
    setCustomTitle("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createRoomSchema.safeParse({
      name,
      tripStart,
      tripEnd: tripEnd || null,
      // 여행 기간을 줄였으면 범위를 벗어난 일차는 마지막 날로 맞춘다
      cards: cards
        .filter((c) => c.selected)
        .map(({ title, category, day, time }) => ({ title, category, day: day === null ? null : Math.min(day, dayCount), time })),
      host: profile,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.path[0] === "tripStart" ? "여행 시작 날짜를 골라주세요." : (issue?.message ?? "입력 값을 확인해주세요."));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { roomId } = await api<{ roomId: string }>("/api/rooms", { body: parsed.data });
      router.push(`/r/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "모임을 만들지 못했어요.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Section step={1} title="모임 정보">
        <div className="space-y-4">
          <div>
            <Label htmlFor="room-name" hint={`${name.length}/${LIMITS.roomName}`}>
              모임 이름
            </Label>
            <TextInput id="room-name" maxLength={LIMITS.roomName} placeholder="예: 부산 1박 2일" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label htmlFor="trip-start">출발일</Label>
              <TextInput id="trip-start" type="date" value={tripStart} onChange={(e) => setTripStart(e.target.value)} />
            </div>
            <div className="min-w-0">
              <Label htmlFor="trip-end" hint="당일치기면 비워두세요">
                돌아오는 날
              </Label>
              <TextInput id="trip-end" type="date" min={tripStart || undefined} value={tripEnd} onChange={(e) => setTripEnd(e.target.value)} />
            </div>
          </div>
        </div>
      </Section>

      <Section step={2} title="결정 카드">
        <p className="mb-3 text-sm text-ink-soft">
          함께 정할 항목을 골라주세요. 카드마다 조건과 후보를 따로 모아요. 일차와 시간을 정해두면 모두 확정된 뒤 시간순 일정표로 보여드려요.
        </p>
        <ul className="space-y-3">
          {cards.map((c) => {
            return (
              <li key={c.id}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={c.selected}
                    onClick={() => updateCard(c.id, { selected: !c.selected })}
                    className={cn(
                      "flex min-h-12 flex-1 items-center gap-3 rounded-xl border px-3 text-left",
                      c.selected ? "border-coral-strong bg-coral-soft" : "border-line bg-white",
                    )}
                  >
                    <span className={cn("flex size-6 items-center justify-center rounded-md border-2", c.selected ? "border-coral-strong bg-coral-strong text-white" : "border-line")}>
                      {c.selected && <Check className="size-4" aria-hidden />}
                    </span>
                    <CardIcon title={c.title} category={c.category} className="size-4 text-ink-soft" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{c.title}</span>
                    <span className="text-xs text-ink-soft">{CATEGORY_LABEL[c.category]}</span>
                  </button>
                  {c.custom && (
                    <button
                      type="button"
                      onClick={() => setCards((all) => all.filter((x) => x.id !== c.id))}
                      className="flex size-11 items-center justify-center rounded-xl text-ink-soft hover:bg-cream"
                      aria-label={`${c.title} 삭제`}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                {c.selected && (
                  <ScheduleFields
                    idPrefix={`card-${c.id}`}
                    className="mt-2 pl-1"
                    day={c.day === null ? null : Math.min(c.day, dayCount)}
                    time={c.time}
                    dayCount={dayCount}
                    tripStart={tripStart || undefined}
                    onChange={(s) => updateCard(c.id, s)}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 rounded-xl bg-cream p-3">
          <Label htmlFor="custom-card">직접 추가</Label>
          <div className="flex gap-2">
            <TextInput
              id="custom-card"
              maxLength={20}
              placeholder="예: 일요일 아침"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button variant="secondary" size="lg" className="shrink-0" icon={<Plus className="size-4" aria-hidden />} onClick={addCustom} disabled={!customTitle.trim() || cards.length >= 8}>
              추가
            </Button>
          </div>
          <div className="mt-2">
            <Segmented name="카드 종류" value={customCategory} options={CATEGORY_OPTIONS} onChange={setCustomCategory} />
          </div>
        </div>
      </Section>

      <Section step={3} title="방장 프로필">
        <ProfileFields idPrefix="host" value={profile} onChange={setProfile} />
      </Section>

      <FieldError>{error}</FieldError>
      <BottomActionBar>
        <Button type="submit" size="lg" block loading={submitting}>
          모임 만들고 초대하기
        </Button>
      </BottomActionBar>
    </form>
  );
}
