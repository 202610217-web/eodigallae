"use client";

import { Crown, Trash2, TriangleAlert, UserMinus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { Notice } from "@/components/ui/States";
import { api } from "@/lib/client/api";
import { useRoom } from "./RoomProvider";

/** 방장 전용 방 설정: 다른 참가자에게 방장 넘기기, 참가자 내보내기, 방 삭제 */
export function RoomSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, act, toast, leaveRoom } = useRoom();
  const [busy, setBusy] = useState<string | null>(null);
  const others = view.members.filter((m) => m.id !== view.me.id);
  const deciding = view.cards.some((c) => c.stage === "deciding");

  const transfer = async (memberId: string, nickname: string) => {
    const ok = await confirmDialog({
      title: `${nickname}님에게 방장을 넘길까요?`,
      description: "넘기면 나는 일반 참가자가 되고, 결정 진행·확정 같은 방장 기능을 쓸 수 없어요.",
      confirmLabel: "방장 넘기기",
    });
    if (!ok) return;
    setBusy(`host-${memberId}`);
    if (await act({ type: "transferHost", memberId })) {
      toast(`${nickname}님이 새 방장이 됐어요.`);
      onClose();
    }
    setBusy(null);
  };

  const kick = async (memberId: string, nickname: string) => {
    const ok = await confirmDialog({
      title: `${nickname}님을 모임에서 내보낼까요?`,
      description: `${nickname}님의 취향·의견·투표 기록이 삭제돼요. 올린 후보는 남아요.`,
      confirmLabel: "내보내기",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(`kick-${memberId}`);
    if (await act({ type: "kickMember", memberId })) toast(`${nickname}님을 내보냈어요.`);
    setBusy(null);
  };

  const deleteRoom = async () => {
    const warnOthers = others.length > 0 ? `\n남아 있는 참가자 ${others.length}명도 모임에서 자동으로 나가게 돼요.` : "";
    const ok = await confirmDialog({
      title: `‘${view.name}’ 방을 삭제할까요?`,
      description: `결정 카드·후보·의견·투표 기록이 모두 사라지고 되돌릴 수 없어요.${warnOthers}`,
      confirmLabel: "방 삭제",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    try {
      // act()는 성공 뒤 상태를 다시 불러오는데, 삭제된 모임은 불러올 수 없으므로 직접 요청한다
      await api(`/api/rooms/${view.id}/actions`, { body: { type: "deleteRoom" } });
      leaveRoom("deleted-by-me");
    } catch (err) {
      toast(err instanceof Error ? err.message : "방을 삭제하지 못했어요.", "error");
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="방 설정" subtitle="방장만 볼 수 있어요.">
      <div className="space-y-6">
        <section aria-labelledby="settings-members" className="space-y-3">
          <h3 id="settings-members" className="text-sm font-bold">
            참가자 관리
          </h3>
          {deciding && others.length > 0 && (
            <Notice tone="warning" icon={<TriangleAlert className="size-5" aria-hidden />} title="결정이 진행 중이에요.">
              진행 중인 결정을 마치거나 취소해야 참가자를 내보낼 수 있어요. 방장 넘기기는 지금도 가능해요.
            </Notice>
          )}

          {others.length === 0 ? (
            <p className="rounded-[var(--radius-card)] bg-white p-5 text-center text-sm text-ink-soft">
              아직 다른 참가자가 없어요. 친구가 들어오면 방장을 넘기거나 내보낼 수 있어요.
            </p>
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
          {others.length > 0 && <p className="text-xs text-ink-soft">내보낸 친구도 초대 링크로 다시 참여할 수 있어요.</p>}
        </section>

        <section aria-labelledby="settings-delete" className="rounded-[var(--radius-card)] bg-white p-4">
          <h3 id="settings-delete" className="text-sm font-bold">
            방 삭제
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            결정 카드·후보·의견·투표 기록이 모두 사라지고 되돌릴 수 없어요. 남아 있는 참가자는 모임에서 자동으로 나가게 돼요.
          </p>
          <Button
            className="mt-3"
            block
            variant="danger"
            disabled={busy !== null}
            loading={busy === "delete"}
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={deleteRoom}
          >
            방 삭제하기
          </Button>
        </section>
      </div>
    </Sheet>
  );
}
