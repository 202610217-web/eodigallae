import { resolveMemberToken } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { getMarbleRace } from "@/lib/server/rooms";

// 재생 중인 구슬 레이스 기록 (모든 참가자가 같은 기록을 받아 같은 시각 기준으로 재생한다)
export async function GET(_request: Request, ctx: RouteContext<"/api/rooms/[roomId]/marble/[cardId]">) {
  try {
    const { roomId, cardId } = await ctx.params;
    const race = await getMarbleRace(roomId, await resolveMemberToken(roomId), cardId);
    return Response.json(race, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
