"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/client/cn";

// 시트가 겹쳐 열렸을 때 Esc는 가장 위의 시트만 닫는다
const openStack: symbol[] = [];

/**
 * 하나의 컴포넌트로 모바일에서는 바텀시트, 768px 이상에서는 오른쪽 패널로 보인다.
 * size="wide"는 카드 상세처럼 내용이 많은 화면용.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  footer,
  size = "normal",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  size?: "normal" | "wide";
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const token = Symbol("sheet");
    openStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openStack[openStack.length - 1] === token) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openStack.splice(openStack.indexOf(token), 1);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 animate-fade bg-ink/40"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-3xl bg-cream outline-none md:h-full md:max-h-none md:animate-sheet-left md:rounded-none md:rounded-l-3xl",
          size === "wide" ? "md:w-[640px] lg:w-[720px]" : "md:w-[440px]",
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden" aria-hidden />
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 pb-3 pt-3 md:px-6 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold leading-snug md:text-xl">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-ink-soft">{subtitle}</div>}
          </div>
          {headerExtra}
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-cream-deep"
            aria-label="닫기"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
