import { Suspense } from "react";
import { LoadingState } from "@/components/ui/States";
import { RoomPage } from "./RoomPage";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="모임 보드를 불러오는 중이에요" className="min-h-dvh" />}>
      <RoomPage />
    </Suspense>
  );
}
