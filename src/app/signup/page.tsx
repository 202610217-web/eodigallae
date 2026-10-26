import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell title="회원가입" description="아이디와 비밀번호만 있으면 바로 시작해요. 어느 기기에서든 로그인해서 이어서 할 수 있어요.">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
