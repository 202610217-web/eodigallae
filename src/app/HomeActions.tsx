"use client";

import { ChevronRight, KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, TextInput } from "@/components/ui/Field";
import { api } from "@/lib/client/api";

export function HomeActions() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
    // 초대 링크 전체를 붙여넣은 경우 마지막 경로를 코드로 쓴다
    const fromLink = code.match(/join\/([0-9A-Za-z]+)/)?.[1]?.toUpperCase();
    const finalCode = fromLink ?? normalized;
    if (finalCode.length !== 6) {
      setError("초대 코드 6자리를 입력하거나 초대 링크를 붙여넣어주세요.");
      return;
    }
    // 이동하기 전에 코드가 맞는지 확인해, 틀렸으면 입력한 내용을 그대로 두고 여기서 알려준다
    setChecking(true);
    try {
      await api(`/api/invite/${finalCode}`);
      router.push(`/join/${finalCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "초대 코드를 확인하지 못했어요.");
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/new"
        className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] bg-coral-strong px-5 py-4 text-white transition-colors hover:bg-[#b93a26]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Plus className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">새로운 모임 만들기</span>
          <span className="block text-sm font-medium text-white">여행 이름과 날짜만 있으면 시작해요</span>
        </span>
        <ChevronRight className="size-5 shrink-0" aria-hidden />
      </Link>

      <form onSubmit={join} className="rounded-[var(--radius-card)] bg-white p-5" noValidate>
        <label htmlFor="invite-code" className="flex items-center gap-2 font-bold">
          <KeyRound className="size-4 text-ink-soft" aria-hidden /> 초대받았나요?
        </label>
        <div className="mt-3 flex gap-2">
          <TextInput
            id="invite-code"
            placeholder="초대 코드 또는 링크"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={200}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "invite-code-error" : undefined}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
          />
          <Button type="submit" variant="secondary" size="lg" className="shrink-0" loading={checking}>
            참여하기
          </Button>
        </div>
        <FieldError id="invite-code-error">{error}</FieldError>
      </form>
    </div>
  );
}
