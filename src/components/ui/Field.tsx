"use client";

import { Check } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/client/cn";

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {children}
      </label>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </div>
  );
}

const inputClass =
  "w-full min-h-12 rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-ink-faint focus:border-coral-strong focus:shadow-[inset_0_0_0_1px_var(--color-coral-strong)] focus:outline-none aria-invalid:border-danger-ink disabled:bg-cream-deep";

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-20 resize-none py-3", className)} {...rest} />;
}

/** 단일 선택 세그먼트 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: readonly { key: T; label: string }[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-1 rounded-xl bg-cream-deep p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors",
            value === o.key ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 여러 개를 고를 수 있는 칩 */
export function ToggleChip({
  selected,
  onClick,
  children,
  tone = "coral",
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "coral" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-50",
        selected
          ? tone === "danger"
            ? "border-danger-ink bg-danger text-danger-ink"
            : "border-coral-strong bg-coral-soft text-[#b9412c]"
          : "border-line bg-white text-ink hover:border-ink-faint",
      )}
    >
      {selected && <Check className="size-4" aria-hidden />}
      {children}
    </button>
  );
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-medium text-danger-ink">
      {children}
    </p>
  );
}
