"use client";

import { Info, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, Label, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";
import { api } from "@/lib/client/api";
import { resetPasswordSchema } from "@/lib/validation";

const subscribeNothing = () => () => {};

/** 아이디 + 복구 코드 + 새 비밀번호. 성공하면 바로 로그인되어 원래 가려던 화면으로 간다. */
export function ResetPasswordForm() {
  const router = useRouter();
  const search = useSyncExternalStore(subscribeNothing, () => window.location.search, () => "");
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ username, recoveryCode, newPassword });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
    if (newPassword !== confirm) return setError("새 비밀번호 확인이 일치하지 않아요.");
    setError(null);
    setSubmitting(true);
    try {
      await api("/api/auth/reset", { body: parsed.data });
      const next = new URLSearchParams(search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했어요.");
      setSubmitting(false);
    }
  };

  const field = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setError(null);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-4 rounded-[var(--radius-card)] bg-white p-5">
        <div>
          <Label htmlFor="reset-username">아이디</Label>
          <TextInput id="reset-username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} value={username} onChange={field(setUsername)} />
        </div>
        <div>
          <Label htmlFor="reset-code" hint="예: K7QX-M2PA-9RTW-H3ND">
            복구 코드
          </Label>
          <TextInput
            id="reset-code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            className="font-mono tracking-wider"
            value={recoveryCode}
            onChange={field(setRecoveryCode)}
          />
        </div>
        <div>
          <Label htmlFor="reset-new" hint="8자 이상">
            새 비밀번호
          </Label>
          <TextInput id="reset-new" type="password" autoComplete="new-password" maxLength={100} value={newPassword} onChange={field(setNewPassword)} />
        </div>
        <div>
          <Label htmlFor="reset-confirm">새 비밀번호 확인</Label>
          <TextInput id="reset-confirm" type="password" autoComplete="new-password" maxLength={100} value={confirm} onChange={field(setConfirm)} />
        </div>
        <FieldError>{error}</FieldError>
      </div>

      <Button type="submit" size="lg" block loading={submitting} icon={<KeyRound className="size-4" aria-hidden />}>
        새 비밀번호로 로그인
      </Button>

      <Notice tone="info" icon={<Info className="size-4" aria-hidden />} title="복구 코드가 없나요?">
        복구 코드는 로그인한 뒤 ‘계정 설정’에서 만들 수 있어요. 만들어 두지 않았다면 재설정할 수 없으니, 새 계정으로 가입해 주세요. 쓴 복구 코드는 다시 쓸 수 없어요.
      </Notice>

      <p className="text-center text-sm text-ink-soft">
        비밀번호가 생각났나요?{" "}
        <Link href={`/login${search}`} className="font-semibold text-coral-strong underline-offset-2 hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
