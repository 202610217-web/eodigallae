"use client";

import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, Label, TextInput } from "@/components/ui/Field";
import { api } from "@/lib/client/api";
import { authSchema } from "@/lib/validation";

/** 로그인 후 돌아갈 주소. 다른 사이트로 보내지 않도록 같은 사이트 경로만 허용 */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const signup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signup) {
      const parsed = authSchema.safeParse({ username, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
        return;
      }
      if (password !== confirm) {
        setError("비밀번호 확인이 일치하지 않아요.");
        return;
      }
    } else if (!username.trim() || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api(signup ? "/api/auth/signup" : "/api/auth/login", { body: { username, password } });
      router.replace(nextPath());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했어요.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-4 rounded-[var(--radius-card)] bg-white p-5">
        <div>
          <Label htmlFor="auth-username" hint={signup ? "영문 소문자·숫자·_ 4~20자" : undefined}>
            아이디
          </Label>
          <TextInput
            id="auth-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
          />
        </div>
        <div>
          <Label htmlFor="auth-password" hint={signup ? "8자 이상" : undefined}>
            비밀번호
          </Label>
          <TextInput
            id="auth-password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            maxLength={100}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
        </div>
        {signup && (
          <div>
            <Label htmlFor="auth-confirm">비밀번호 확인</Label>
            <TextInput
              id="auth-confirm"
              type="password"
              autoComplete="new-password"
              maxLength={100}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
            />
          </div>
        )}
        <FieldError>{error}</FieldError>
      </div>

      <Button
        type="submit"
        size="lg"
        block
        loading={submitting}
        icon={signup ? <UserPlus className="size-4" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
      >
        {signup ? "가입하기" : "로그인"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        {signup ? "이미 계정이 있나요? " : "아직 계정이 없나요? "}
        <Link href={signup ? "/login" : "/signup"} className="font-semibold text-coral-strong underline-offset-2 hover:underline">
          {signup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </form>
  );
}
