import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell title="로그인" description="로그인하고 친구들과 여행을 정해요.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
