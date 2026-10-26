import { getCurrentUser, listMyRooms } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";

// 로그인 상태와 내 계정에 연결된 모임 목록. 로그인하지 않았으면 user: null.
export async function GET() {
  try {
    const user = await getCurrentUser();
    const rooms = user ? await listMyRooms(user.id) : [];
    return Response.json({ user: user && { username: user.username }, rooms }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
