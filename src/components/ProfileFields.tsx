"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Label, TextInput } from "@/components/ui/Field";
import { cn } from "@/lib/client/cn";
import { CHARACTERS, COLORS, LIMITS, type CharacterKey, type ColorKey } from "@/lib/domain/constants";

export interface ProfileDraft {
  nickname: string;
  character: CharacterKey;
  color: ColorKey;
}

export const DEFAULT_PROFILE: ProfileDraft = { nickname: "", character: "cat", color: "coral" };

/** 닉네임 + 캐릭터 + 색상 선택. 모임 생성·참여·데모에서 함께 쓴다. */
export function ProfileFields({ value, onChange, idPrefix }: { value: ProfileDraft; onChange: (v: ProfileDraft) => void; idPrefix: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar character={value.character} color={value.color} size="lg" className="animate-rise-in" key={`${value.character}-${value.color}`} />
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${idPrefix}-nickname`} hint={`${value.nickname.length}/${LIMITS.nickname}`}>
            닉네임
          </Label>
          <TextInput
            id={`${idPrefix}-nickname`}
            maxLength={LIMITS.nickname}
            placeholder="친구들이 알아볼 이름"
            autoComplete="nickname"
            value={value.nickname}
            onChange={(e) => onChange({ ...value, nickname: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>캐릭터</Label>
        <div role="radiogroup" aria-label="캐릭터" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {CHARACTERS.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={value.character === c.key}
              aria-label={c.label}
              onClick={() => onChange({ ...value, character: c.key })}
              className={cn(
                "flex min-h-14 items-center justify-center rounded-xl border-2 bg-white",
                value.character === c.key ? "border-coral-strong" : "border-transparent hover:border-line",
              )}
            >
              <Avatar character={c.key} color={value.color} size="md" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>색상</Label>
        <div role="radiogroup" aria-label="색상" className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={value.color === c.key}
              aria-label={c.key}
              onClick={() => onChange({ ...value, color: c.key })}
              className={cn("flex size-11 items-center justify-center rounded-full border-2", value.color === c.key ? "border-ink" : "border-transparent")}
            >
              <span className="size-8 rounded-full" style={{ backgroundColor: c.hex }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
