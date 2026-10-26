"use client";

import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_PROFILE, ProfileFields, type ProfileDraft } from "@/components/ProfileFields";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { api } from "@/lib/client/api";
import { profileSchema } from "@/lib/validation";

export function DemoForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDraft>(DEFAULT_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const { roomId } = await api<{ roomId: string }>("/api/demo", { body: parsed.data });
      router.push(`/r/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데모 모임을 만들지 못했어요.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <section className="rounded-[var(--radius-card)] bg-white p-5">
        <ProfileFields idPrefix="demo" value={profile} onChange={setProfile} />
      </section>
      <FieldError>{error}</FieldError>
      <BottomActionBar>
        <Button type="submit" size="lg" block loading={submitting} icon={<FlaskConical className="size-5" aria-hidden />}>
          데모 모임 만들기
        </Button>
      </BottomActionBar>
    </form>
  );
}
