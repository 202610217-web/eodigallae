"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_PROFILE, ProfileFields, type ProfileDraft } from "@/components/ProfileFields";
import { usePrefillProfile } from "@/components/account/useAccount";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { FieldError, Label, TextInput } from "@/components/ui/Field";
import { api } from "@/lib/client/api";
import { tripDayCount } from "@/lib/client/format";
import { LIMITS } from "@/lib/domain/constants";
import { createRoomSchema } from "@/lib/validation";
import { CardBuilder, type CardDraft } from "./CardBuilder";

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
  // 예시 카드 없이 방장이 직접 만든다
  const [cards, setCards] = useState<CardDraft[]>([]);
  const dayCount = tripDayCount(tripStart, tripEnd || null);
  const [profile, setProfile] = useState<ProfileDraft>(DEFAULT_PROFILE);
  usePrefillProfile(setProfile);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createRoomSchema.safeParse({
      name,
      tripStart,
      tripEnd: tripEnd || null,
      // 여행 기간을 줄였으면 범위를 벗어난 일차는 마지막 날로 맞춘다
      cards: cards.map(({ title, icon, day, time }) => ({ title, icon, day: day === null ? null : Math.min(day, dayCount), time })),
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
          함께 정할 항목을 직접 만들어주세요. 카드마다 조건과 후보를 따로 모아요. 일차와 시간을 정해두면 모두 확정된 뒤 시간순 일정표로 보여드려요.
        </p>
        <CardBuilder cards={cards} onChange={setCards} dayCount={dayCount} tripStart={tripStart} />
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
