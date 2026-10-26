import Link from "next/link";
import type { ReactNode } from "react";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/client/cn";

const TABS = [
  { key: "profile", label: "프로필", href: "/settings/profile" },
  { key: "account", label: "계정", href: "/settings/account" },
] as const;

/** 설정 화면 공통: 제목 + 프로필/계정 탭 */
export function SettingsShell({ tab, children }: { tab: (typeof TABS)[number]["key"]; children: ReactNode }) {
  return (
    <PageShell title="설정" description="내 프로필과 계정을 관리해요.">
      <nav aria-label="설정 메뉴" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-cream-deep p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
              tab === t.key ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </PageShell>
  );
}
