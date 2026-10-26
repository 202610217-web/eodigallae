import { MapPin } from "lucide-react";
import Link from "next/link";
import { ProfileMenu } from "@/components/account/ProfileMenu";
import { cn } from "@/lib/client/cn";
import { HomeActions } from "./HomeActions";
import { HomeGuide } from "./HomeGuide";
import { HOME_PRIMARY } from "./homeStyles";
import { MyRoomsSection } from "./MyRooms";

const TAGLINE = "취향은 모으고, 결정은 함께!";

// 한 열 보드: 소개·만들기 → 초대 코드 참여 → 내 모임 카드 → 진행 안내
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-3 pb-12 md:px-10 md:pt-6 md:pb-16">
      <header className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 md:gap-3.5">
          <span className="flex shrink-0 items-center gap-1 md:gap-1.5">
            <MapPin className="size-6 text-coral-strong md:size-8" fill="currentColor" stroke="white" strokeWidth={1.75} aria-hidden />
            <span className="text-lg font-extrabold tracking-tight md:text-[26px]">어디갈래?</span>
          </span>
          <span className="h-3.5 w-px shrink-0 bg-line md:h-5" aria-hidden />
          <span className="min-w-0 truncate text-[11px] text-ink-soft md:text-sm">{TAGLINE}</span>
        </span>
        <ProfileMenu compact />
      </header>

      <section className="mt-6 flex flex-col gap-4 md:mt-14 md:flex-row md:items-center md:justify-between md:gap-8">
        <div>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight md:text-[46px]">함께 정할 여행</h1>
          <p className="mt-1 text-[15px] text-ink-soft md:mt-1.5 md:text-xl">{TAGLINE}</p>
        </div>
        <Link
          href="/new"
          className={cn(
            HOME_PRIMARY,
            "flex min-h-12 shrink-0 items-center justify-center rounded-[10px] px-6 text-base md:min-h-[58px] md:w-[200px] md:text-lg",
          )}
        >
          모임 만들기
        </Link>
      </section>

      <div className="mt-5 space-y-5 md:mt-8 md:space-y-6">
        <HomeActions />
        <MyRoomsSection />
        <HomeGuide />
      </div>
    </main>
  );
}
