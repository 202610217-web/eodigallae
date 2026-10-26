"use client";

import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/client/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "md" | "lg" | "sm";

const VARIANT: Record<Variant, string> = {
  primary: "bg-coral-strong text-white hover:bg-[#b93a26] disabled:bg-[#f2b3a8]",
  secondary: "bg-white text-ink border border-line hover:bg-cream disabled:text-ink-faint",
  ghost: "bg-transparent text-ink-soft hover:bg-cream-deep disabled:text-ink-faint",
  danger: "bg-white text-danger-ink border border-[#f3c4bd] hover:bg-danger disabled:text-ink-faint",
  success: "bg-success-ink text-white hover:bg-[#165e35] disabled:opacity-60",
};

const SIZE: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "min-h-11 px-4 text-[15px] rounded-xl gap-2",
  lg: "min-h-12 px-5 text-base rounded-xl gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  block,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
