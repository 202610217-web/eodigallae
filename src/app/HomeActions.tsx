"use client";

import { ChevronRight, FlaskConical, KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, TextInput } from "@/components/ui/Field";
import { readRecentRooms, recentRoomsSnapshot } from "@/lib/client/recent";

const subscribeNothing = () => () => {};

export function HomeActions() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  // localStorage는 브라우저에서만 읽을 수 있어 서버 렌더링에서는 빈 목록으로 그린다
  const snapshot = useSyncExternalStore(subscribeNothing, recentRoomsSnapshot, () => null);
  const recent = useMemo(() => (snapshot === null ? [] : readRecentRooms()), [snapshot]);

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

      {recent.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5">
          <h2 className="text-sm font-bold text-ink-soft">최근 들어간 모임</h2>
          <ul className="mt-2 divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/r/${r.id}`} className="flex min-h-12 items-center gap-2 font-semibold">
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <ChevronRight className="size-4 text-ink-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/demo" className="flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <FlaskConical className="size-4" aria-hidden /> 가상 친구들이 있는 데모 모임으로 둘러보기
      </Link>
    </div>
  );
}
