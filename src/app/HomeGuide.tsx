import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/client/cn";

const STEPS = [
  { title: "의견 모으기", text: "여행지, 분위기, 하고 싶은 걸 익명으로 나눠요.", tone: "bg-coral-soft text-coral-strong" },
  { title: "후보 올리기", text: "가고 싶은 곳을 자유롭게 추가해요.", tone: "bg-warning text-warning-ink" },
  { title: "함께 결정", text: "모두의 의견을 모아 최종 일정을 정해요.", tone: "bg-success text-success-ink" },
];

/** 처음 온 사람에게 진행 흐름을 보여주는 안내 카드 (초대 카드의 '사용 방법 보기'가 여기로 온다) */
export function HomeGuide() {
  return (
    <section
      id="home-guide"
      aria-labelledby="home-guide-title"
      className="scroll-mt-6 rounded-[var(--radius-card)] border border-line/60 bg-white/70 px-4 py-4 md:px-8 md:py-8"
    >
      <h2 id="home-guide-title" className="text-[15px] font-bold md:text-xl">
        어디갈래? 이렇게 진행돼요
      </h2>
      <ol className="mt-3 grid grid-cols-1 gap-3.5 md:mt-6 md:gap-5 lg:grid-cols-3 lg:gap-6">
        {STEPS.map(({ title, text, tone }, i) => (
          <li key={title} className="relative flex items-start gap-3.5 md:gap-6 lg:pr-12">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold md:size-12 md:text-base",
                tone,
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 pt-0.5 md:pt-0">
              <p className="text-sm leading-snug font-bold md:text-lg">{title}</p>
              <p className="mt-0.5 text-[13px] text-ink-soft md:mt-1.5 md:text-[15px]">{text}</p>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="absolute top-3 right-2 hidden size-5 text-ink-soft lg:block xl:right-4" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
