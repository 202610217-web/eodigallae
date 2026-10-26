"use client";

import { CalendarDays, Check, Copy, MapPin, Share2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatTrip } from "@/lib/client/format";
import { useRoom } from "./RoomProvider";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-xl bg-coral text-white">
        <MapPin className="size-5" strokeWidth={2.5} aria-hidden />
      </span>
      {!compact && <span className="text-lg font-extrabold tracking-tight">어디갈래?</span>}
    </span>
  );
}

export function RoomHeader() {
  const { view } = useRoom();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/" aria-label="어디갈래? 처음 화면으로" className="shrink-0">
          <Logo compact />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold leading-tight md:text-2xl">{view.name}</h1>
          <p className="flex items-center gap-1 text-[13px] text-ink-soft">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{formatTrip(view.tripStart, view.tripEnd)}</span>
          </p>
        </div>
        <Button variant="secondary" size="md" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setInviteOpen(true)}>
          <span className="hidden sm:inline">친구 </span>초대
        </Button>
      </div>
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </header>
  );
}

export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, toast } = useRoom();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/join/${view.inviteCode}`;

  const copy = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast("복사하지 못했어요. 직접 선택해서 복사해주세요.", "error");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `${view.name} — 어디갈래?`, text: "여행 취향 모으러 와!", url: link });
    } catch {
      // 사용자가 공유를 취소한 경우
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="친구 초대하기" subtitle="링크나 코드를 받은 친구는 로그인한 뒤 바로 참여할 수 있어요.">
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-white p-5 text-center">
          <p className="text-sm font-semibold text-ink-soft">초대 코드</p>
          <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.25em] text-ink">{view.inviteCode}</p>
          <Button
            variant="secondary"
            className="mt-4"
            icon={copied === "code" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            onClick={() => copy(view.inviteCode, "code")}
          >
            {copied === "code" ? "복사했어요" : "코드 복사"}
          </Button>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-4">
          <p className="text-sm font-semibold text-ink-soft">초대 링크</p>
          <p className="mt-1 break-all rounded-lg bg-cream px-3 py-2 text-sm">{link}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              icon={copied === "link" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              onClick={() => copy(link, "link")}
            >
              {copied === "link" ? "복사했어요" : "링크 복사"}
            </Button>
            <Button variant="secondary" icon={<Share2 className="size-4" aria-hidden />} onClick={share}>
              공유하기
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
