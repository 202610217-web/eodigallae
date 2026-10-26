import { AuthForm } from "@/components/AuthForm";
import { PageShell } from "@/components/PageShell";

export default function LoginPage() {
  return (
    <PageShell title="로그인" description="로그인하면 내 모임을 어느 기기에서나 이어서 볼 수 있어요.">
      <AuthForm mode="login" />
    </PageShell>
  );
}
