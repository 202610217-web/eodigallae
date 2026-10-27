"use client";

import { CircleCheck, Info, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui/States";
import type { LeftReason } from "@/components/room/RoomProvider";

const MESSAGES: Record<LeftReason, { tone: "info" | "success"; title: string; body: string }> = {
  deleted: {
    tone: "info",
    title: "방장이 모임을 삭제했어요.",
    body: "그래서 모임에서 자동으로 나가졌어요. 새 모임을 만들거나 다른 초대 코드로 참여해보세요.",
  },
  removed: {
    tone: "info",
    title: "모임에서 나가게 됐어요.",
    body: "방장이 내보냈거나 이 기기의 참여 기록이 사라졌어요. 초대 링크로 다시 참여할 수 있어요.",
  },
  "deleted-by-me": {
    tone: "success",
    title: "방을 삭제했어요.",
    body: "남아 있던 참가자도 모임에서 나가게 돼요.",
  },
};

/** 모임 화면에서 처음 화면으로 나온 이유(`/?left=...`)를 알려준다 */
export function LeftRoomNotice() {
  const router = useRouter();
  const reason = useSearchParams().get("left");
  const msg = reason && reason in MESSAGES ? MESSAGES[reason as LeftReason] : null;
  if (!msg) return null;
  const Icon = msg.tone === "success" ? CircleCheck : Info;
  return (
    <div className="relative mt-4 animate-rise-in">
      <Notice tone={msg.tone} icon={<Icon className="size-5" aria-hidden />} title={msg.title} className="pr-12">
        {msg.body}
      </Notice>
      <button
        type="button"
        aria-label="안내 닫기"
        onClick={() => router.replace("/", { scroll: false })}
        className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
