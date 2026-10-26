import { CircleCheck, CircleDashed, Hourglass, ListChecks, Lock, Vote } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/client/cn";
import type { CardDisplayStatus } from "@/lib/domain/types";

// 상태는 색만으로 구분하지 않고 아이콘 + 한국어 문구를 함께 보여준다.

type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "coral";

const TONE: Record<Tone, string> = {
  neutral: "bg-cream-deep text-ink-soft",
  info: "bg-info text-info-ink",
  warning: "bg-warning text-warning-ink",
  success: "bg-success text-success-ink",
  danger: "bg-danger text-danger-ink",
  coral: "bg-coral-soft text-[#b9412c]",
};

export function Pill({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

const CARD_STATUS: Record<CardDisplayStatus, { tone: Tone; label: string; icon: ReactNode }> = {
  collecting: { tone: "info", label: "의견 수집 중", icon: <CircleDashed className="size-3.5" aria-hidden /> },
  reviewing: { tone: "warning", label: "후보 확인", icon: <ListChecks className="size-3.5" aria-hidden /> },
  deciding: { tone: "coral", label: "결정 중", icon: <Vote className="size-3.5" aria-hidden /> },
  confirmed: { tone: "success", label: "확정", icon: <CircleCheck className="size-3.5" aria-hidden /> },
};

export const CARD_STATUS_STEPS: CardDisplayStatus[] = ["collecting", "reviewing", "deciding", "confirmed"];

export function StatusBadge({ status, className }: { status: CardDisplayStatus; className?: string }) {
  const s = CARD_STATUS[status];
  return (
    <Pill tone={s.tone} icon={s.icon} className={className}>
      {s.label}
    </Pill>
  );
}

export function cardStatusLabel(status: CardDisplayStatus) {
  return CARD_STATUS[status].label;
}

export function LockedBadge() {
  return (
    <Pill tone="neutral" icon={<Lock className="size-3.5" aria-hidden />}>
      잠김
    </Pill>
  );
}

export function WaitingBadge({ children }: { children: ReactNode }) {
  return (
    <Pill tone="neutral" icon={<Hourglass className="size-3.5" aria-hidden />}>
      {children}
    </Pill>
  );
}
