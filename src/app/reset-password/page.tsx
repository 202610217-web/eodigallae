import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell title="비밀번호 재설정" description="계정 설정에서 만들어 둔 복구 코드로 새 비밀번호를 정해요.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
