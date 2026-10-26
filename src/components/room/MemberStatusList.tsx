"use client";

import { CircleCheck, Crown, Settings2, UserPlus } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/StatusBadge";
import { memberProgress } from "@/lib/client/selectors";
import { MemberManageSheet } from "./MemberManageSheet";
import { InviteSheet } from "./RoomHeader";
import { useRoom } from "./RoomProvider";

export function MemberStatusList() {
  const { view } = useRoom();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const progress = view.members.map((m) => ({ member: m, ...memberProgress(view, m) }));
  const readyCount = progress.filter((p) => p.ready).length;
  const alone = view.members.length < 2;

  return (
    <section aria-labelledby="members-title" className="rounded-[var(--radius-card)] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 id="members-title" className="shrink-0 whitespace-nowrap text-lg font-bold">
          참가자 <span className="text-ink-faint">{view.members.length}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <Pill tone={readyCount === view.members.length ? "success" : "neutral"} icon={<CircleCheck className="size-3.5" aria-hidden />}>
            {readyCount}/{view.members.length}명 의견 완료
          </Pill>
          {view.me.isHost && !alone && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 whitespace-nowrap"
              icon={<Settings2 className="size-3.5" aria-hidden />}
              onClick={() => setManageOpen(true)}
            >
              관리
            </Button>
          )}
        </div>
      </div>

      <ul className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:gap-2 lg:overflow-visible">
        {progress.map(({ member, readyCards, totalCards, ready }, i) => (
          <li
            key={member.id}
            className="stagger flex w-[76px] shrink-0 flex-col items-center gap-1 text-center lg:w-auto lg:flex-row lg:gap-3 lg:rounded-xl lg:px-1 lg:py-1.5 lg:text-left"
            style={{ "--i": i } as CSSProperties}
          >
            <span className="relative">
              <Avatar character={member.character} color={member.color} size="md" />
              {ready && (
                <span className="absolute -right-1 -bottom-1 flex size-5 animate-pop items-center justify-center rounded-full bg-success-ink text-white ring-2 ring-white">
                  <CircleCheck className="size-3.5" aria-label="의견 제출 완료" />
                </span>
              )}
            </span>
            <div className="min-w-0 lg:flex-1">
              <p className="flex items-center justify-center gap-1 truncate text-[13px] font-bold lg:justify-start lg:text-sm">
                <span className="truncate">{member.nickname}</span>
                {member.isHost && <Crown className="size-3.5 shrink-0 text-[#B7860B]" aria-label="방장" />}
                {member.id === view.me.id && <span className="shrink-0 text-xs font-medium text-coral-strong">나</span>}
              </p>
              <p className="truncate text-xs text-ink-soft">
                의견 {readyCards}/{totalCards}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {alone && (
        <div className="mt-3 rounded-xl bg-info p-3 text-sm text-info-ink">
          <p className="font-bold">친구를 초대해 여행을 시작해보세요.</p>
          <p className="mt-0.5 text-ink">친구가 들어오면 일정마다 의견을 함께 모을 수 있어요.</p>
          <Button className="mt-2" size="sm" variant="secondary" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setInviteOpen(true)}>
            초대 링크 열기
          </Button>
        </div>
      )}
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {view.me.isHost && <MemberManageSheet open={manageOpen} onClose={() => setManageOpen(false)} />}
    </section>
  );
}
