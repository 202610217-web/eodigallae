import { AuthForm } from "@/components/AuthForm";
import { PageShell } from "@/components/PageShell";

export default function SignupPage() {
  return (
    <PageShell
      title="회원가입"
      description="가입은 선택이에요. 가입하면 지금 이 브라우저로 참여한 모임도 계정에 연결돼서, 다른 기기에서도 같은 참가자로 이어서 할 수 있어요."
    >
      <AuthForm mode="signup" />
    </PageShell>
  );
}
