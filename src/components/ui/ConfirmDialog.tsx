"use client";

import { CircleHelp, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/client/cn";
import { Button } from "./Button";

// 브라우저 기본 확인 창(window.confirm) 대신 쓰는 앱 안 확인 창.
// 어디서든 `if (!(await confirmDialog({ ... }))) return;` 처럼 부르고, 화면은 레이아웃의 <ConfirmDialogHost />가 그린다.

export interface ConfirmOptions {
  title: string;
  /** 줄바꿈(\n)은 그대로 보인다 */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: 삭제·내보내기처럼 되돌릴 수 없는 일 */
  tone?: "default" | "danger";
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let current: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  current?.resolve(false); // 이미 열린 창이 있으면 취소로 닫고 새 창을 연다
  return new Promise((resolve) => {
    current = { ...options, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  if (!current) return;
  const { resolve } = current;
  current = null;
  emit();
  resolve(ok);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function ConfirmDialogHost() {
  const pending = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return pending ? <Dialog key={pending.title + (pending.description ?? "")} {...pending} /> : null;
}

function Dialog({ title, description, confirmLabel = "확인", cancelLabel = "취소", tone = "default" }: ConfirmOptions) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const danger = tone === "danger";

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 되돌릴 수 없는 일이 Enter 한 번으로 실행되지 않도록 처음 초점은 '취소'에 둔다
    panelRef.current?.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
    // 캡처 단계에서 먼저 받아, 뒤에 열린 시트의 Esc 닫기까지 번지지 않게 막는다
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        settle(false);
      } else if (e.key === "Tab") {
        const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  const Icon = danger ? TriangleAlert : CircleHelp;

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-4">
      <div className="absolute inset-0 animate-fade bg-ink/40" aria-hidden onClick={() => settle(false)} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full max-w-sm animate-rise-in rounded-[var(--radius-card)] bg-white p-5"
      >
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl",
            danger ? "bg-danger text-danger-ink" : "bg-coral-soft text-coral-strong",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 id={titleId} className="mt-3 text-lg font-bold leading-snug">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1.5 whitespace-pre-line text-sm text-ink-soft">
            {description}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button data-cancel variant="secondary" size="lg" onClick={() => settle(false)}>
            {cancelLabel}
          </Button>
          <Button size="lg" onClick={() => settle(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
