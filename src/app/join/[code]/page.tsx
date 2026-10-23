import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { LoadingState } from "@/components/ui/States";
import { JoinForm } from "./JoinForm";

export default function JoinPage() {
  return (
    <PageShell title="모임 참여하기" description="가입 없이 닉네임과 캐릭터만 고르면 바로 참여해요.">
      <Suspense fallback={<LoadingState label="초대 정보를 확인하는 중이에요" />}>
        <JoinForm />
      </Suspense>
    </PageShell>
  );
}
