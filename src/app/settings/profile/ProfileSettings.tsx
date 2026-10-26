"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useAccount, type Account } from "@/components/account/useAccount";
import { ProfileFields, type ProfileDraft } from "@/components/ProfileFields";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { LoadingState, Notice } from "@/components/ui/States";
import { api } from "@/lib/client/api";
import { profileSchema } from "@/lib/validation";

export function ProfileSettings() {
  const { account, setAccount } = useAccount();
  if (account === undefined) return <LoadingState label="프로필을 불러오는 중이에요" />;
  if (account === null) return <Notice tone="danger" icon={<TriangleAlert className="size-4" aria-hidden />} title="로그인이 끊겼어요. 다시 로그인해주세요." />;
  return <ProfileForm account={account} onSaved={setAccount} />;
}

function ProfileForm({ account, onSaved }: { account: Account; onSaved: (a: Account) => void }) {
  const [profile, setProfile] = useState<ProfileDraft>({ nickname: account.nickname, character: account.character, color: account.color });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { account: next } = await api<{ account: Account }>("/api/account/profile", { body: parsed.data });
      onSaved(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <section className="rounded-[var(--radius-card)] bg-white p-5">
        <h2 className="text-lg font-bold">기본 프로필</h2>
        <p className="mt-1 mb-5 text-sm text-ink-soft">모임을 만들거나 참여할 때 이 닉네임과 캐릭터가 미리 채워져요. 모임마다 바꿀 수도 있어요.</p>
        <ProfileFields idPrefix="settings" value={profile} onChange={(v) => { setProfile(v); setSaved(false); }} />
        <FieldError>{error}</FieldError>
      </section>
      <p className="text-sm text-ink-soft">이미 참여한 모임의 닉네임은 바뀌지 않아요.</p>
      <Button type="submit" size="lg" block loading={saving} icon={saved ? <Check className="size-4" aria-hidden /> : undefined}>
        {saved ? "저장했어요" : "프로필 저장"}
      </Button>
    </form>
  );
}
