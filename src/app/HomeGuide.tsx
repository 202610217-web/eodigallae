import { CalendarCheck, ChevronRight, ListChecks, Scale, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { MODE_INFO } from "@/components/decision/modeInfo";
import { Avatar } from "@/components/ui/Avatar";
import { DECISION_MODES, type CharacterKey, type ColorKey } from "@/lib/domain/constants";

// 데모 모임에 미리 들어 있는 가상 친구들 (src/lib/server/rooms.ts의 데모 데이터와 같다)
const DEMO_FRIENDS: { nickname: string; character: CharacterKey; color: ColorKey }[] = [
  { nickname: "민지", character: "rabbit", color: "sky" },
  { nickname: "준호", character: "dog", color: "mint" },
  { nickname: "서연", character: "bird", color: "violet" },
];

const STEPS: { icon: LucideIcon; title: string; text: ReactNode }[] = [
  { icon: Users, title: "모임 만들고 초대", text: "초대 코드나 링크를 단톡방에 보내면 친구들이 들어와요." },
  { icon: ListChecks, title: "의견 투표", text: "방장이 일정마다 만든 질문에 각자 답하고, 제출하면 익명 집계를 봐요." },
  { icon: Scale, title: "후보 등록", text: "의견 집계를 참고해서 식당·활동·숙소 후보를 올려요." },
  { icon: CalendarCheck, title: "함께 결정하고 일정표로", text: <ModeChips /> },
];

/** 처음 온 사람에게 진행 흐름과 결정 방식, 데모 모임을 보여주는 안내 카드 */
export function HomeGuide() {
  return (
    <section aria-labelledby="home-guide-title" className="rounded-[var(--radius-card)] bg-white p-5">
      <h2 id="home-guide-title" className="text-lg font-bold">
        이렇게 함께 정해요
      </h2>
      <ol className="mt-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="relative flex gap-3 pb-5 last:pb-0">
            {/* 단계 사이를 잇는 선 */}
            {i < STEPS.length - 1 && <span className="absolute top-11 bottom-1 left-5 w-px bg-line" aria-hidden />}
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-ink">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-2">
              <p className="font-bold leading-snug">{title}</p>
              <div className="mt-1 text-sm text-ink-soft">{text}</div>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/demo"
        className="mt-5 flex min-h-16 items-center gap-3 rounded-xl bg-cream px-3 py-3 transition-colors hover:bg-cream-deep"
      >
        <span className="flex shrink-0 -space-x-2.5 pl-0.5">
          {DEMO_FRIENDS.map((f, i) => (
            <Avatar
              key={f.nickname}
              character={f.character}
              color={f.color}
              className="animate-gather"
              // 오른쪽에서 차례로 모여든다
              style={{ "--from-x": `${(i + 1) * 10}px`, animationDelay: `${120 + i * 90}ms` } as CSSProperties}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">데모 모임 둘러보기</span>
          <span className="block text-sm text-balance text-ink-soft">
            {DEMO_FRIENDS.map((f) => f.nickname).join("·")}의 의견과 후보가 미리 들어 있어요
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
      </Link>
    </section>
  );
}

function ModeChips() {
  return (
    <>
      <span className="block">모두 확정되면 일차·시간순 일정표가 돼요. 결정 방식은 네 가지예요.</span>
      <span className="mt-2 flex flex-wrap gap-1.5">
        {DECISION_MODES.map(({ key }) => {
          const { icon: Icon, title } = MODE_INFO[key];
          return (
            <span key={key} className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-[13px] font-semibold text-[#b9412c]">
              <Icon className="size-3.5" aria-hidden />
              {title}
            </span>
          );
        })}
      </span>
    </>
  );
}
