"use client";

import { ArrowRight, FlaskConical, Home, KeyRound, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { TextInput } from "@/components/ui/Field";
import { nextStep } from "@/lib/client/selectors";
import { CardDetail, defaultTab, type DetailTab } from "./CardDetail";
import { ConfirmedPlan } from "./ConfirmedPlan";
import { DecisionCard } from "./DecisionCard";
import { InviteSheet, RoomHeader } from "./RoomHeader";
import { MemberStatusList } from "./MemberStatusList";
import { RoomProvider, useRoom, type LoadError } from "./RoomProvider";

export function RoomApp({ roomId }: { roomId: string }) {
  return (
    <RoomProvider roomId={roomId} Fallback={RoomFallback}>
      <Board />
    </RoomProvider>
  );
}

function RoomFallback({ loading, error, retry }: { loading: boolean; error: LoadError | null; retry: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  if (loading || !error) return <LoadingState label="모임 보드를 불러오는 중이에요" className="min-h-dvh" />;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      {error.code === "NOT_MEMBER" ? (
        <ErrorState
          title="아직 이 모임에 참여하지 않았어요"
          description="이 브라우저에서는 참여 기록이 없어요. 초대 코드를 입력하거나 친구에게 받은 초대 링크로 들어와주세요."
          action={
            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) router.push(`/join/${encodeURIComponent(code.trim())}`);
              }}
            >
              <TextInput aria-label="초대 코드" placeholder="초대 코드 6자리" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <Button type="submit" size="lg" icon={<KeyRound className="size-4" aria-hidden />}>
                참여
              </Button>
            </form>
          }
        />
      ) : (
        <ErrorState
          title={error.status === 404 ? "모임을 찾을 수 없어요" : "모임 정보를 불러오지 못했어요"}
          description={error.message}
          action={
            <>
              <Button variant="secondary" icon={<RefreshCw className="size-4" aria-hidden />} onClick={retry}>
                다시 시도
              </Button>
              <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-coral-strong px-4 font-semibold text-white">
                <Home className="size-4" aria-hidden /> 처음으로
              </Link>
            </>
          }
        />
      )}
    </main>
  );
}

function Board() {
  const { view } = useRoom();
  const [detail, setDetail] = useState<{ cardId: string; tab: DetailTab } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const openCard = (cardId: string, tab?: DetailTab) => {
    const card = view.cards.find((c) => c.id === cardId);
    if (card) setDetail({ cardId, tab: tab ?? defaultTab(card, view.me.id) });
  };
  const detailCard = detail ? view.cards.find((c) => c.id === detail.cardId) : null;
  const step = nextStep(view);
  const confirmedCount = view.cards.filter((c) => c.stage === "confirmed").length;

  const stepAction = (() => {
    switch (step.kind) {
      case "questions":
        return { label: `‘${step.card.title}’ 질문 만들기`, run: () => openCard(step.card.id, "opinion") };
      case "opinion":
        return { label: `‘${step.card.title}’ 의견 제출하기`, run: () => openCard(step.card.id, "opinion") };
      case "invite":
        return { label: "친구 초대하기", run: () => setInviteOpen(true) };
      case "candidate":
        return { label: `‘${step.card.title}’ 후보 등록하기`, run: () => openCard(step.card.id, "candidates") };
      case "decide":
        return { label: `‘${step.card.title}’ 결정하러 가기`, run: () => openCard(step.card.id, "decision") };
      default:
        return null;
    }
  })();

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-4 md:px-6 md:py-6">
        {view.isDemo && (
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-info px-4 py-3 text-sm text-info-ink">
            <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>데모 모임</strong> · 민지·준호·서연은 미리 입력된 가상 참가자라 투표·게임에 직접 참여하지 않아요. 저장은 실제 DB에 돼요.
            </span>
          </p>
        )}
        {view.storage === "local" && (
          <p className="mb-4 text-xs text-ink-faint">로컬 개발 DB(PGlite) 사용 중 · 이 PC의 서버에서만 공유돼요.</p>
        )}

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <MemberStatusList />
          </aside>

          <section aria-labelledby="cards-title" className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 id="cards-title" className="text-xl font-bold">
                결정 카드
              </h2>
              <span className="text-sm font-semibold text-ink-soft">
                확정 {confirmedCount}/{view.cards.length}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {view.cards.map((card, i) => (
                <DecisionCard key={card.id} card={card} index={i} onOpen={() => openCard(card.id)} />
              ))}
            </div>

            {stepAction && (
              <div className="mt-4 hidden md:block">
                <button
                  type="button"
                  onClick={stepAction.run}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-ink px-5 py-4 text-left text-white"
                >
                  <span>
                    <span className="block text-xs font-semibold text-white/70">다음에 할 일</span>
                    <span className="block font-bold">{stepAction.label}</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0" aria-hidden />
                </button>
              </div>
            )}

            <div className="mt-4 xl:hidden">
              <ConfirmedPlan onOpenCard={(id) => openCard(id)} />
            </div>
          </section>

          <aside className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
            <ConfirmedPlan onOpenCard={(id) => openCard(id)} />
          </aside>
        </div>
      </main>

      {stepAction && (
        <div className="md:hidden">
          <BottomActionBar>
            <Button size="lg" block icon={<ArrowRight className="size-5" aria-hidden />} onClick={stepAction.run}>
              {stepAction.label}
            </Button>
          </BottomActionBar>
        </div>
      )}

      {detailCard && detail && <CardDetail key={detailCard.id} card={detailCard} initialTab={detail.tab} onClose={() => setDetail(null)} />}
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
