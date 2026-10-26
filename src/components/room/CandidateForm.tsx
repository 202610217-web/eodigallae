"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, Label, TextArea, TextInput, ToggleChip } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { TASTE_ICON } from "@/components/ui/TasteChip";
import { formatWon } from "@/lib/client/format";
import { LIMITS, TASTES, type TasteKey } from "@/lib/domain/constants";
import type { Candidate, DecisionCardView } from "@/lib/domain/types";
import { candidateFields } from "@/lib/validation";
import { useRoom } from "./RoomProvider";

// 후보는 일정에 등록한다. 친구들의 의견 집계를 참고하되, 후보를 의견과 자동으로 비교하지는 않는다.
// 이전의 특징·실내/야외·분위기 값은 보내지 않아 서버가 기존 값을 그대로 둔다.
interface Draft {
  name: string;
  cost: string;
  costOther: boolean;
  costNote: string;
  tags: TasteKey[];
  link: string;
  description: string;
}

function toDraft(c: Candidate | null): Draft {
  const notes = c?.notes ?? {};
  return {
    name: c?.name ?? "",
    cost: c?.cost != null ? String(c.cost) : "",
    costOther: c ? c.cost === null && Boolean(notes.cost) : false,
    costNote: notes.cost ?? "",
    tags: c?.tags ?? [],
    link: c?.link ?? "",
    description: c?.description ?? "",
  };
}

/** '기타'를 골랐을 때 나타나는 내용 입력칸 */
function OtherInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextInput
      id={id}
      aria-label="기타 내용"
      className="mt-2"
      maxLength={40}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** 후보 등록·수정. 모바일에서는 바텀시트, PC에서는 오른쪽 패널로 열린다. */
export function CandidateForm({
  open,
  onClose,
  card,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  card: DecisionCardView;
  editing: Candidate | null;
}) {
  const { act } = useRoom();
  const [draft, setDraft] = useState<Draft>(() => toDraft(editing));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    const parsed = candidateFields.safeParse({
      name: draft.name,
      cost: draft.costOther || draft.cost === "" ? null : Number(draft.cost),
      tags: draft.tags,
      notes: { cost: draft.costOther ? draft.costNote : undefined },
      link: draft.link,
      description: draft.description,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
      return;
    }
    if (!draft.costOther && draft.cost === "") {
      setError("예상 1인 비용을 입력하거나 ‘기타’를 골라 내용을 적어주세요.");
      return;
    }
    if (draft.costOther && !draft.costNote.trim()) {
      setError("예상 1인 비용의 ‘기타’ 내용을 적어주세요.");
      return;
    }
    setError(null);
    setSaving(true);
    const ok = await act(
      editing
        ? { type: "updateCandidate", candidateId: editing.id, candidate: parsed.data }
        : { type: "addCandidate", cardId: card.id, candidate: parsed.data },
    );
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "후보 수정" : "후보 등록"}
      subtitle={`${card.title}에 넣을 장소나 활동을 알려주세요.`}
      footer={
        <div>
          <FieldError>{error}</FieldError>
          <Button size="lg" block className="mt-2" loading={saving} onClick={submit}>
            {editing ? "수정 완료" : "후보 등록하기"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-4">
        <div>
          <Label htmlFor="cand-name" hint={`${draft.name.length}/${LIMITS.candidateName}`}>
            장소 또는 활동 이름 <span className="text-danger-ink">*</span>
          </Label>
          <TextInput
            id="cand-name"
            maxLength={LIMITS.candidateName}
            placeholder="예: 바다 산책, 보드게임 카페"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="cand-cost" hint="확정 일정에 함께 보여줘요">
            예상 1인 비용
          </Label>
          <div className="relative">
            <TextInput
              id="cand-cost"
              inputMode="numeric"
              placeholder="예: 15000 (무료면 0)"
              disabled={draft.costOther}
              value={draft.costOther ? "" : draft.cost}
              onChange={(e) => set("cost", e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
              className="pr-10"
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-soft">원</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ToggleChip selected={draft.costOther} onClick={() => set("costOther", !draft.costOther)}>
              기타
            </ToggleChip>
            {!draft.costOther && draft.cost !== "" && <span className="text-xs text-ink-soft">1인 {formatWon(Number(draft.cost))}</span>}
          </div>
          {draft.costOther && (
            <>
              <OtherInput id="cand-cost-note" value={draft.costNote} onChange={(v) => set("costNote", v)} placeholder="예: 메뉴마다 달라요, 현장에서 결제" />
            </>
          )}
        </div>

        <div>
          <Label hint="최대 4개">특징 태그</Label>
          <div className="flex flex-wrap gap-2">
            {TASTES.map((t) => {
              const Icon = TASTE_ICON[t.key];
              const selected = draft.tags.includes(t.key);
              return (
                <ToggleChip
                  key={t.key}
                  selected={selected}
                  disabled={!selected && draft.tags.length >= 4}
                  onClick={() => set("tags", selected ? draft.tags.filter((x) => x !== t.key) : [...draft.tags, t.key])}
                >
                  {!selected && <Icon className="size-4 text-ink-soft" aria-hidden />}
                  {t.label}
                </ToggleChip>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="cand-link">지도 또는 참고 링크</Label>
          <TextInput
            id="cand-link"
            type="url"
            inputMode="url"
            placeholder="https://map.naver.com/..."
            value={draft.link}
            onChange={(e) => set("link", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="cand-desc" hint={`${draft.description.length}/${LIMITS.description}`}>
            짧은 설명
          </Label>
          <TextArea
            id="cand-desc"
            maxLength={LIMITS.description}
            placeholder="영업시간, 웨이팅, 추천 메뉴 등"
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>
    </Sheet>
  );
}
