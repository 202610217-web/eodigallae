"use client";

import { CalendarDays, Home, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_PROFILE, ProfileFields, type ProfileDraft } from "@/components/ProfileFields";
import { Avatar } from "@/components/ui/Avatar";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/client/api";
import { formatTrip } from "@/lib/client/format";
import type { CharacterKey, ColorKey } from "@/lib/domain/constants";
import { joinSchema } from "@/lib/validation";

interface Preview {
  roomId: string;
  name: string;
  tripStart: string;
  tripEnd: string | null;
  alreadyMember: boolean;
  members: { nickname: string; character: CharacterKey; color: ColorKey; isHost: boolean }[];
}

export function JoinForm() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDraft>(DEFAULT_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Preview>(`/api/invite/${encodeURIComponent(code)}`)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "초대 정보를 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loadError) {
    return (
      <ErrorState
        title="초대 코드를 확인해주세요"
        description={loadError}
        action={
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-coral-strong px-4 font-semibold text-white">
            <Home className="size-4" aria-hidden /> 처음 화면에서 다시 입력
          </Link>
        }
      />
    );
  }
  if (!preview) return <LoadingState label="초대 정보를 확인하는 중이에요" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = joinSchema.safeParse(profile);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { roomId } = await api<{ roomId: string }>(`/api/invite/${encodeURIComponent(code)}/join`, { body: parsed.data });
      router.push(`/r/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "참여하지 못했어요.");
      setSubmitting(false);
    }
  };

  const names = preview.members.map((m) => m.nickname);
  const waiting =
    preview.members.length <= 1
      ? `아직 ${names[0] ?? "방장"}님만 있어요. 첫 번째 친구가 되어주세요!`
      : `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` 외 ${names.length - 3}명` : ""}이(가) 기다리고 있어요`;

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-card)] bg-white p-5">
        <p className="text-sm font-semibold text-ink-soft">초대받은 모임</p>
        <h2 className="mt-1 text-xl font-extrabold break-words">{preview.name}</h2>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
          <CalendarDays className="size-4" aria-hidden /> {formatTrip(preview.tripStart, preview.tripEnd)}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex shrink-0 -space-x-2">
            {preview.members.slice(0, 6).map((m, i) => (
              <Avatar key={`${m.nickname}-${i}`} character={m.character} color={m.color} size="sm" label={m.nickname} />
            ))}
          </div>
          <p className="min-w-0 text-sm text-ink-soft">{waiting}</p>
        </div>
      </section>

      {preview.alreadyMember ? (
        <div className="rounded-[var(--radius-card)] bg-white p-5 text-center">
          <p className="font-bold">이미 이 브라우저로 참여한 모임이에요.</p>
          <Button className="mt-3" size="lg" icon={<LogIn className="size-4" aria-hidden />} onClick={() => router.push(`/r/${preview.roomId}`)}>
            모임 보드로 이동
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <section className="rounded-[var(--radius-card)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">내 프로필</h2>
            <ProfileFields idPrefix="join" value={profile} onChange={setProfile} />
          </section>
          <FieldError>{error}</FieldError>
          <BottomActionBar>
            <Button type="submit" size="lg" block loading={submitting} icon={<UserPlus className="size-5" aria-hidden />}>
              모임에 참여하기
            </Button>
          </BottomActionBar>
        </form>
      )}
    </div>
  );
}
