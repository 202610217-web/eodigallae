"use client";

import { ChevronRight, FlaskConical, KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, TextInput } from "@/components/ui/Field";

export function HomeActions() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
    // 초대 링크 전체를 붙여넣은 경우 마지막 경로를 코드로 쓴다
    const fromLink = code.match(/join\/([0-9A-Za-z]+)/)?.[1]?.toUpperCase();
    const finalCode = fromLink ?? normalized;
    if (finalCode.length !== 6) {
      setError("초대 코드 6자리를 입력하거나 초대 링크를 붙여넣어주세요.");
      return;
    }
    router.push(`/join/${finalCode}`);
  };

  return (
    <div className="space-y-4">
      <Link
        href="/new"
        className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] bg-coral-strong px-5 py-4 text-white transition-colors hover:bg-[#d84a33]"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/20">
          <Plus className="size-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold">새로운 모임 만들기</span>
          <span className="block text-sm text-white/85">여행 이름과 날짜만 있으면 시작해요</span>
        </span>
        <ChevronRight className="size-5" aria-hidden />
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
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
          />
          <Button type="submit" size="lg" className="shrink-0">
            참여하기
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </form>


      <Link href="/demo" className="flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <FlaskConical className="size-4" aria-hidden /> 가상 친구들이 있는 데모 모임으로 둘러보기
      </Link>
    </div>
  );
}
