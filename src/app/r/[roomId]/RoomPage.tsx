"use client";

import { useParams } from "next/navigation";
import { RoomApp } from "@/components/room/RoomBoard";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  return <RoomApp roomId={roomId} />;
}
