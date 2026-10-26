"use client";

import { Crown, TriangleAlert, UserMinus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Notice } from "@/components/ui/States";
import { useRoom } from "./RoomProvider";

/** 방장 전용: 다른 참가자에게 방장 넘기기, 참가자 내보내기 */
export function MemberManageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, act, toast } = useRoom();
  const [busy, setBusy] = useState<string | null>(null);
  const others = view.members.filter((m) => m.id !== view.me.id);
  const deciding = view.cards.some((c) => c.stage === "deciding");

  const transfer = async (memberId: string, nickname: string) => {
    if (!window.confirm(`${nickname}님에게 방장을 넘길까요?\n넘기면 나는 일반 참가자가 되고, 결정 진행·확정 같은 방장 기능을 쓸 수 없어요.`)) return;
    setBusy(`host-${memberId}`);
    if (await act({ type: "transferHost", memberId })) {
      toast(`${nickname}님이 새 방장이 됐어요.`);
      onClose();
    }
    setBusy(null);
  };

  const kick = async (memberId: string, nickname: string) => {
    if (!window.confirm(`${nickname}님을 모임에서 내보낼까요?\n${nickname}님의 취향·의견·투표 기록이 삭제돼요. 올린 후보는 남아요.`)) return;
    setBusy(`kick-${memberId}`);
    if (await act({ type: "kickMember", memberId })) toast(`${nickname}님을 내보냈어요.`);
    setBusy(null);
  };

  return (
    <Sheet open={open} onClose={onClose} title="참가자 관리" subtitle="방장만 볼 수 있어요.">
      <div className="space-y-3">
        {deciding && (
          <Notice tone="warning" icon={<TriangleAlert className="size-5" aria-hidden />} title="결정이 진행 중이에요.">
            진행 중인 결정을 마치거나 취소해야 참가자를 내보낼 수 있어요. 방장 넘기기는 지금도 가능해요.
          </Notice>
        )}

        {others.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-white p-5 text-center text-sm text-ink-soft">아직 다른 참가자가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {others.map((m) => (
              <li key={m.id} className="rounded-[var(--radius-card)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <Avatar character={m.character} color={m.color} />
                  <p className="min-w-0 flex-1 truncate font-bold">
                    {m.nickname}
                    {m.isBot && <span className="ml-1.5 text-xs font-medium text-ink-faint">가상 참가자</span>}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={m.isBot || busy !== null}
                    loading={busy === `host-${m.id}`}
                    icon={<Crown className="size-3.5" aria-hidden />}
                    onClick={() => transfer(m.id, m.nickname)}
                  >
                    방장 넘기기
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deciding || busy !== null}
                    loading={busy === `kick-${m.id}`}
                    icon={<UserMinus className="size-3.5" aria-hidden />}
                    onClick={() => kick(m.id, m.nickname)}
                  >
                    내보내기
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-ink-soft">내보낸 친구도 초대 링크로 다시 참여할 수 있어요.</p>
      </div>
    </Sheet>
  );
}
