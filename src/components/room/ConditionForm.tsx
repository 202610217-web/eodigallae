"use client";

import { CircleCheck, Heart, Pencil, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FieldError, Label, Segmented, TextArea, TextInput, ToggleChip } from "@/components/ui/Field";
import { Pill } from "@/components/ui/StatusBadge";
import { Notice } from "@/components/ui/States";
import { formatWon } from "@/lib/client/format";
import { myCondition } from "@/lib/client/selectors";
import { LIMITS, RESTRICTIONS, SETTINGS, VIBES, type SettingKey, type VibeKey } from "@/lib/domain/constants";
import type { DecisionCardView, MemberCondition } from "@/lib/domain/types";
import { useRoom } from "./RoomProvider";

const BUDGET_PRESETS = [10_000, 20_000, 30_000, 50_000, 100_000];

interface Draft {
  noLimit: boolean;
  budget: string;
  restrictions: string[];
  setting: SettingKey;
  vibe: VibeKey;
  wish: string;
  note: string;
}

function toDraft(c: MemberCondition | null): Draft {
  return {
    noLimit: c ? c.maxBudget === null : false,
    budget: c?.maxBudget != null ? String(c.maxBudget) : "",
    restrictions: c?.restrictions ?? [],
    setting: c?.setting ?? "any",
    vibe: c?.vibe ?? "any",
    wish: c?.wish ?? "",
    note: c?.note ?? "",
  };
}

function SectionHead({ tone, icon, title, desc }: { tone: "must" | "prefer"; icon: ReactNode; title: string; desc: string }) {
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-xl px-3 py-3 ${tone === "must" ? "bg-danger" : "bg-info"}`}>
      <span className={tone === "must" ? "text-danger-ink" : "text-info-ink"}>{icon}</span>
      <div>
        <p className="flex items-center gap-2 font-bold">
          {title}
          <Pill tone={tone === "must" ? "danger" : "info"}>{tone === "must" ? "필수" : "선호"}</Pill>
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">{desc}</p>
      </div>
    </div>
  );
}

/** 결정 카드별 조건 입력. 필수(후보 차단) → 선호(참고) 2단계로 짧게 나눈다. */
export function ConditionForm({ card, editable, lockedReason }: { card: DecisionCardView; editable: boolean; lockedReason: string | null }) {
  const { view, act } = useRoom();
  const current = myCondition(card, view.me.id);
  const [editing, setEditing] = useState(!current?.ready);
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"ready" | "draft" | null>(null);
  const restriction = RESTRICTIONS[card.category];

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const budgetValue = (): number | null | "invalid" => {
    if (draft.noLimit) return null;
    const n = Number(draft.budget.replace(/[^0-9]/g, ""));
    if (!draft.budget.trim() || !Number.isFinite(n)) return "invalid";
    return n;
  };

  const goNext = () => {
    if (budgetValue() === "invalid") {
      setError("1인 최대 예산을 입력하거나 ‘예산 제한 없음’을 골라주세요.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const save = async (ready: boolean) => {
    const budget = budgetValue();
    if (budget === "invalid") {
      setStep(1);
      setError("1인 최대 예산을 입력하거나 ‘예산 제한 없음’을 골라주세요.");
      return;
    }
    setSaving(ready ? "ready" : "draft");
    const ok = await act({
      type: "saveCondition",
      condition: {
        cardId: card.id,
        maxBudget: budget,
        restrictions: draft.restrictions,
        setting: draft.setting,
        vibe: draft.vibe,
        wish: draft.wish,
        note: draft.note,
        ready,
      },
    });
    setSaving(null);
    if (ok && ready) {
      setEditing(false);
      setStep(1);
    }
  };

  const members = view.members.map((m) => ({ m, c: card.conditions.find((x) => x.memberId === m.id) }));

  return (
    <div className="space-y-5">
      {lockedReason && (
        <Notice tone="info" icon={<ShieldAlert className="size-5" aria-hidden />} title="지금은 조건을 바꿀 수 없어요">
          {lockedReason}
        </Notice>
      )}

      {!editing && current ? (
        <ConditionSummary condition={current} category={card.category} onEdit={editable ? () => {
          setDraft(toDraft(current));
          setEditing(true);
        } : undefined} />
      ) : editable ? (
        <div className="rounded-[var(--radius-card)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2" aria-label={`${step}/2단계`}>
            <span className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-coral" : "bg-cream-deep"}`} />
            <span className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-coral" : "bg-cream-deep"}`} />
            <span className="ml-1 text-xs font-bold text-ink-soft">{step}/2</span>
          </div>

          {step === 1 ? (
            <div>
              <SectionHead
                tone="must"
                icon={<ShieldAlert className="size-5" aria-hidden />}
                title="필수 조건"
                desc="이 조건에 걸리는 후보는 최종 선택 대상에서 빠져요."
              />
              <Label htmlFor={`budget-${card.id}`} hint="이 카드 1인 기준">
                최대 예산
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <TextInput
                    id={`budget-${card.id}`}
                    inputMode="numeric"
                    placeholder="예: 25000"
                    value={draft.noLimit ? "" : draft.budget}
                    disabled={draft.noLimit}
                    onChange={(e) => set("budget", e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-soft">원</span>
                </div>
              </div>
              {!draft.noLimit && draft.budget && Number(draft.budget) > 0 && (
                <p className="mt-1 text-xs text-ink-soft">1인 최대 {formatWon(Number(draft.budget))}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((v) => (
                  <ToggleChip key={v} selected={!draft.noLimit && Number(draft.budget) === v} onClick={() => setDraft((d) => ({ ...d, noLimit: false, budget: String(v) }))}>
                    {formatWon(v)}
                  </ToggleChip>
                ))}
                <ToggleChip selected={draft.noLimit} onClick={() => set("noLimit", !draft.noLimit)}>
                  예산 제한 없음
                </ToggleChip>
              </div>
              <FieldError>{error}</FieldError>

              <div className="mt-6">
                <Label hint="여러 개 선택 가능">{restriction.memberLabel}</Label>
                <div className="flex flex-wrap gap-2">
                  {restriction.options.map((o) => (
                    <ToggleChip
                      key={o}
                      tone="danger"
                      selected={draft.restrictions.includes(o)}
                      onClick={() =>
                        set("restrictions", draft.restrictions.includes(o) ? draft.restrictions.filter((x) => x !== o) : [...draft.restrictions, o])
                      }
                    >
                      {o}
                    </ToggleChip>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-soft">없으면 고르지 않고 넘어가면 돼요.</p>
              </div>
            </div>
          ) : (
            <div>
              <SectionHead
                tone="prefer"
                icon={<Heart className="size-5" aria-hidden />}
                title="선호 조건"
                desc="추천 이유에 참고로만 보여주고, 후보를 막지는 않아요."
              />
              <div className="space-y-5">
                <div>
                  <Label>실내 또는 야외</Label>
                  <Segmented name="실내 또는 야외" value={draft.setting} options={SETTINGS} onChange={(v) => set("setting", v)} />
                </div>
                <div>
                  <Label>분위기</Label>
                  <Segmented name="분위기" value={draft.vibe} options={VIBES} onChange={(v) => set("vibe", v)} />
                </div>
                <div>
                  <Label htmlFor={`wish-${card.id}`} hint={`${draft.wish.length}/${LIMITS.wish}`}>
                    이번 결정에서 특별히 원하는 점
                  </Label>
                  <TextInput
                    id={`wish-${card.id}`}
                    maxLength={LIMITS.wish}
                    placeholder="예: 바다가 보였으면 좋겠어요"
                    value={draft.wish}
                    onChange={(e) => set("wish", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`note-${card.id}`} hint={`${draft.note.length}/${LIMITS.note}`}>
                    추가 의견
                  </Label>
                  <TextArea
                    id={`note-${card.id}`}
                    maxLength={LIMITS.note}
                    placeholder="친구들에게 전하고 싶은 말을 짧게 남겨주세요"
                    value={draft.note}
                    onChange={(e) => set("note", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {step === 1 ? (
              <>
                {current?.ready && (
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    취소
                  </Button>
                )}
                <Button size="lg" className="flex-1" onClick={goNext}>
                  다음: 선호 조건
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
                  이전
                </Button>
                <Button variant="ghost" size="lg" loading={saving === "draft"} disabled={saving !== null} onClick={() => save(false)}>
                  임시 저장
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  loading={saving === "ready"}
                  disabled={saving !== null}
                  icon={<CircleCheck className="size-5" aria-hidden />}
                  onClick={() => save(true)}
                >
                  준비 완료
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-white p-4 text-sm text-ink-soft">아직 입력한 조건이 없어요.</p>
      )}

      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <h3 className="mb-3 font-bold">참가자 준비 현황</h3>
        <ul className="space-y-2">
          {members.map(({ m, c }) => (
            <li key={m.id} className="flex items-center gap-3">
              <Avatar character={m.character} color={m.color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {m.nickname}
                {m.id === view.me.id && <span className="ml-1 text-xs text-coral-strong">나</span>}
              </span>
              {c?.ready ? (
                <Pill tone="success" icon={<CircleCheck className="size-3.5 animate-pop" aria-hidden />}>
                  준비 완료
                </Pill>
              ) : c ? (
                <Pill tone="warning">작성 중</Pill>
              ) : (
                <Pill tone="neutral">미입력</Pill>
              )}
            </li>
          ))}
        </ul>
        <OthersWishes card={card} />
      </div>
    </div>
  );
}

function ConditionSummary({
  condition,
  category,
  onEdit,
}: {
  condition: MemberCondition;
  category: DecisionCardView["category"];
  onEdit?: () => void;
}) {
  const setting = SETTINGS.find((s) => s.key === condition.setting)?.label;
  const vibe = VIBES.find((s) => s.key === condition.vibe)?.label;
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold">
          <span className="flex size-7 animate-pop items-center justify-center rounded-full bg-success text-success-ink">
            <CircleCheck className="size-4" aria-hidden />
          </span>
          내 조건 준비 완료
        </p>
        {onEdit && (
          <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" aria-hidden />} onClick={onEdit}>
            수정하기
          </Button>
        )}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-[#f3c4bd] px-3 py-2">
          <dt className="text-xs font-bold text-danger-ink">필수 · 최대 예산</dt>
          <dd className="font-semibold">{condition.maxBudget === null ? "제한 없음" : `1인 ${formatWon(condition.maxBudget)}`}</dd>
        </div>
        <div className="rounded-xl border border-[#f3c4bd] px-3 py-2">
          <dt className="text-xs font-bold text-danger-ink">필수 · {RESTRICTIONS[category].memberLabel}</dt>
          <dd className="font-semibold">{condition.restrictions.length ? condition.restrictions.join(", ") : "없음"}</dd>
        </div>
        <div className="rounded-xl border border-[#c9d8f6] px-3 py-2">
          <dt className="text-xs font-bold text-info-ink">선호 · 장소/분위기</dt>
          <dd className="font-semibold">
            {setting} · {vibe}
          </dd>
        </div>
        <div className="rounded-xl border border-[#c9d8f6] px-3 py-2">
          <dt className="text-xs font-bold text-info-ink">선호 · 원하는 점</dt>
          <dd className="font-semibold">{condition.wish || "—"}</dd>
        </div>
      </dl>
      {condition.note && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-sm">“{condition.note}”</p>}
    </div>
  );
}

/** 다른 참가자가 남긴 원하는 점·의견 (자유 입력은 분석하지 않고 그대로 보여준다) */
function OthersWishes({ card }: { card: DecisionCardView }) {
  const { view } = useRoom();
  const notes = card.conditions.filter((c) => c.wish || c.note);
  if (notes.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-3">
      <h4 className="mb-2 text-sm font-bold">친구들이 남긴 말</h4>
      <ul className="space-y-2">
        {notes.map((c) => (
          <li key={c.memberId} className="rounded-xl bg-cream px-3 py-2 text-sm">
            <span className="font-bold">{view.members.find((m) => m.id === c.memberId)?.nickname}</span>
            {c.wish && <span className="ml-1 text-ink-soft">원하는 점: {c.wish}</span>}
            {c.note && <p className="mt-0.5">{c.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
