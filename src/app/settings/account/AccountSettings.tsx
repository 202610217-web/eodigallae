"use client";

import { Check, Copy, KeyRound, LogOut, MonitorSmartphone, ShieldCheck, TriangleAlert, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAccount, type Account } from "@/components/account/useAccount";
import { Button } from "@/components/ui/Button";
import { FieldError, Label, TextInput } from "@/components/ui/Field";
import { LoadingState, Notice } from "@/components/ui/States";
import { api } from "@/lib/client/api";
import { changePasswordSchema, changeUsernameSchema } from "@/lib/validation";

export function AccountSettings() {
  const { account, setAccount } = useAccount();
  if (account === undefined) return <LoadingState label="계정 정보를 불러오는 중이에요" />;
  if (account === null) {
    return <Notice tone="danger" icon={<TriangleAlert className="size-4" aria-hidden />} title="로그인이 끊겼어요. 다시 로그인해주세요." />;
  }
  return (
    <div className="space-y-4">
      <UsernameSection account={account} onChanged={setAccount} />
      <PasswordSection />
      <RecoverySection account={account} onChanged={() => setAccount({ ...account, hasRecovery: true })} />
      <DevicesSection />
      <DeleteSection />
    </div>
  );
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="text-ink-soft">{icon}</span>
        {title}
      </h2>
      {description && <div className="mt-1 text-sm text-ink-soft">{description}</div>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** 입력 하나짜리 폼에서 공통으로 쓰는 제출 상태 */
function useSubmit() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  return { error, setError, busy, run };
}

function PasswordInput({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <TextInput id={id} type="password" maxLength={100} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function UsernameSection({ account, onChanged }: { account: Account; onChanged: (a: Account) => void }) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(account.username);
  const [password, setPassword] = useState("");
  const { error, setError, busy, run } = useSubmit();
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = changeUsernameSchema.safeParse({ username, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
    void run(async () => {
      const { account: next } = await api<{ account: Account }>("/api/account/username", { body: parsed.data });
      onChanged(next);
      setEditing(false);
      setPassword("");
      setDone(true);
    });
  };

  return (
    <Section icon={<UserRound className="size-5" aria-hidden />} title="아이디" description="로그인할 때 쓰는 아이디예요. 친구들에게는 모임 닉네임이 보여요.">
      {!editing ? (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate font-mono text-base font-bold">{account.username}</p>
          {done && <span className="text-sm font-semibold text-success-ink">바꿨어요</span>}
          <Button variant="secondary" onClick={() => { setEditing(true); setDone(false); setUsername(account.username); }}>
            변경
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="new-username" hint="영문 소문자·숫자·_ 4~20자">
              새 아이디
            </Label>
            <TextInput id="new-username" autoCapitalize="none" spellCheck={false} maxLength={20} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <PasswordInput id="username-password" label="현재 비밀번호" value={password} onChange={setPassword} autoComplete="current-password" />
          <FieldError>{error}</FieldError>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setEditing(false); setError(null); }}>
              취소
            </Button>
            <Button type="submit" loading={busy} className="flex-1">
              아이디 바꾸기
            </Button>
          </div>
        </form>
      )}
    </Section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const { error, setError, busy, run } = useSubmit();
  const [result, setResult] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const parsed = changePasswordSchema.safeParse({ currentPassword: current, newPassword: next });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "입력 값을 확인해주세요.");
    if (next !== confirm) return setError("새 비밀번호 확인이 일치하지 않아요.");
    if (next === current) return setError("지금 비밀번호와 다른 비밀번호를 입력해주세요.");
    void run(async () => {
      const { endedSessions } = await api<{ endedSessions: number }>("/api/account/password", { body: parsed.data });
      setCurrent("");
      setNext("");
      setConfirm("");
      setResult(endedSessions > 0 ? `비밀번호를 바꿨어요. 다른 기기 ${endedSessions}곳의 로그인도 끝냈어요.` : "비밀번호를 바꿨어요.");
    });
  };

  return (
    <Section icon={<KeyRound className="size-5" aria-hidden />} title="비밀번호 변경" description="바꾸면 이 기기를 뺀 다른 기기는 다시 로그인해야 해요.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <PasswordInput id="pw-current" label="현재 비밀번호" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordInput id="pw-new" label="새 비밀번호 (8자 이상)" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordInput id="pw-confirm" label="새 비밀번호 확인" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <FieldError>{error}</FieldError>
        {result && <p className="flex items-center gap-1.5 text-sm font-semibold text-success-ink"><Check className="size-4" aria-hidden /> {result}</p>}
        <Button type="submit" loading={busy} block>
          비밀번호 바꾸기
        </Button>
      </form>
    </Section>
  );
}

function RecoverySection({ account, onChanged }: { account: Account; onChanged: () => void }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { error, setError, busy, run } = useSubmit();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setError("현재 비밀번호를 입력해주세요.");
    void run(async () => {
      const res = await api<{ code: string }>("/api/account/recovery", { body: { password } });
      setCode(res.code);
      setPassword("");
      onChanged();
    });
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Section
      icon={<ShieldCheck className="size-5" aria-hidden />}
      title="비밀번호 복구 코드"
      description="비밀번호를 잊었을 때 로그인 화면의 ‘비밀번호 재설정’에서 이 코드로 새 비밀번호를 정할 수 있어요."
    >
      {code ? (
        <div className="space-y-3">
          <Notice tone="warning" icon={<TriangleAlert className="size-4" aria-hidden />} title="지금 한 번만 보여드려요">
            안전한 곳(메모 앱, 사진 등)에 저장해 두세요. 다시 만들면 이 코드는 쓸 수 없어요.
          </Notice>
          <div className="flex items-center gap-2 rounded-xl bg-cream p-3">
            <code className="min-w-0 flex-1 text-center font-mono text-lg font-extrabold tracking-wider break-all">{code}</code>
            <Button variant="secondary" size="sm" onClick={copy} icon={copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}>
              {copied ? "복사됨" : "복사"}
            </Button>
          </div>
          <Button variant="ghost" block onClick={() => setCode(null)}>
            저장했어요
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {account.hasRecovery ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-success-ink">
              <Check className="size-4" aria-hidden /> 복구 코드를 만들어 두었어요. 잃어버렸다면 새로 만들 수 있어요.
            </p>
          ) : (
            <Notice tone="warning" icon={<TriangleAlert className="size-4" aria-hidden />} title="아직 복구 코드가 없어요">
              복구 코드가 없으면 비밀번호를 잊었을 때 계정을 되찾을 수 없어요.
            </Notice>
          )}
          <PasswordInput id="recovery-password" label="현재 비밀번호" value={password} onChange={setPassword} autoComplete="current-password" />
          <FieldError>{error}</FieldError>
          <Button type="submit" variant={account.hasRecovery ? "secondary" : "primary"} loading={busy} block>
            {account.hasRecovery ? "복구 코드 새로 만들기" : "복구 코드 만들기"}
          </Button>
        </form>
      )}
    </Section>
  );
}

function DevicesSection() {
  const { error, busy, run } = useSubmit();
  const [result, setResult] = useState<string | null>(null);
  return (
    <Section icon={<MonitorSmartphone className="size-5" aria-hidden />} title="로그인된 기기" description="다른 사람 기기에서 로그인했거나 기기를 잃어버렸다면, 이 기기를 뺀 모든 곳에서 로그아웃할 수 있어요.">
      <div className="space-y-3">
        <FieldError>{error}</FieldError>
        {result && <p className="flex items-center gap-1.5 text-sm font-semibold text-success-ink"><Check className="size-4" aria-hidden /> {result}</p>}
        <Button
          variant="secondary"
          block
          loading={busy}
          icon={<LogOut className="size-4" aria-hidden />}
          onClick={() =>
            run(async () => {
              const { endedSessions } = await api<{ endedSessions: number }>("/api/account/sessions", { method: "POST" });
              setResult(endedSessions > 0 ? `다른 기기 ${endedSessions}곳에서 로그아웃했어요.` : "다른 기기에 로그인된 곳이 없어요.");
            })
          }
        >
          다른 기기에서 모두 로그아웃
        </Button>
      </div>
    </Section>
  );
}

function DeleteSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const { error, setError, busy, run } = useSubmit();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return setError("안내를 확인하고 체크해주세요.");
    if (!password) return setError("현재 비밀번호를 입력해주세요.");
    void run(async () => {
      await api("/api/account/delete", { body: { password } });
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <Section icon={<Trash2 className="size-5" aria-hidden />} title="회원 탈퇴">
      {!open ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">계정을 지우면 되돌릴 수 없어요.</p>
          <Button variant="danger" block onClick={() => setOpen(true)}>
            회원 탈퇴하기
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Notice tone="danger" icon={<TriangleAlert className="size-4" aria-hidden />} title="정말 탈퇴할까요?">
            아이디·비밀번호·프로필이 지워지고 되돌릴 수 없어요. 참여했던 모임의 기록(조건·후보·투표)은 친구들을 위해 남지만, 이 계정으로는 다시 들어갈 수 없어요.
          </Notice>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-coral-strong" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            위 내용을 확인했어요
          </label>
          <PasswordInput id="delete-password" label="현재 비밀번호" value={password} onChange={setPassword} autoComplete="current-password" />
          <FieldError>{error}</FieldError>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setOpen(false); setError(null); }}>
              취소
            </Button>
            <Button type="submit" variant="danger" loading={busy} className="flex-1">
              탈퇴하기
            </Button>
          </div>
        </form>
      )}
    </Section>
  );
}
