import { PageShell } from "@/components/PageShell";
import { CreateRoomForm } from "./CreateRoomForm";

export default function NewRoomPage() {
  return (
    <PageShell title="새 모임 만들기" description="방장이 되어 모임을 만들고 친구를 초대해요.">
      <CreateRoomForm />
    </PageShell>
  );
}
