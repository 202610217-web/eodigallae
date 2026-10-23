import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/client/cn";

/** 비어 있는 화면에서도 다음에 할 행동을 알려준다. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-5 py-8 text-center",
        className,
      )}
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-coral-soft text-coral-strong">{icon}</div>
      <p className="text-base font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "불러오는 중이에요", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-3 py-16 text-ink-soft", className)}>
      <LoaderCircle className="size-7 animate-spin text-coral" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[var(--radius-card)] bg-white px-5 py-10 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-danger text-danger-ink">
        <CircleAlert className="size-6" aria-hidden />
      </div>
      <p className="text-base font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** 상태 안내 상자. tone별로 아이콘을 함께 넘긴다. */
export function Notice({
  tone,
  icon,
  title,
  children,
  className,
}: {
  tone: "info" | "warning" | "danger" | "success";
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const toneClass = {
    info: "bg-info text-info-ink",
    warning: "bg-warning text-warning-ink",
    danger: "bg-danger text-danger-ink",
    success: "bg-success text-success-ink",
  }[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl px-4 py-3", toneClass, className)} role={tone === "danger" ? "alert" : undefined}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        {children && <div className="mt-1 text-sm text-ink">{children}</div>}
      </div>
    </div>
  );
}
