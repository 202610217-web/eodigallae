import { errorResponse } from "@/lib/server/errors";
import { getRoomView } from "@/lib/server/rooms";
import { readMemberToken } from "@/lib/server/session";

// 참가자 화면이 주기적으로 조회하는 모임 상태. 요청한 참가자 기준으로 숨길 정보(투표 내역 등)를 걸러서 보낸다.
export async function GET(_request: Request, ctx: RouteContext<"/api/rooms/[roomId]/state">) {
  try {
    const { roomId } = await ctx.params;
    const view = await getRoomView(roomId, await readMemberToken(roomId));
    return Response.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
