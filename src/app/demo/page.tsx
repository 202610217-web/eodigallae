import { PageShell } from "@/components/PageShell";
import { DemoForm } from "./DemoForm";

export default function DemoPage() {
  return (
    <PageShell
      title="데모 모임 둘러보기"
      description="가상 친구 3명(민지·준호·서연)의 의견·후보가 미리 들어간 모임을 만들어요. 내가 방장이 돼요."
    >
      <DemoForm />
    </PageShell>
  );
}
