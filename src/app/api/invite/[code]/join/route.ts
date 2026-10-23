import { errorResponse } from "@/lib/server/errors";
import { isMemberOf, joinRoom, getInvitePreview } from "@/lib/server/rooms";
import { normalizeInviteCode, readMemberToken, setMemberCookie } from "@/lib/server/session";
import { joinSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/invite/[code]/join">) {
  try {
    const code = normalizeInviteCode((await ctx.params).code);
    const profile = joinSchema.parse(await request.json());
    // 이미 이 브라우저로 참여한 모임이면 새 참가자를 만들지 않는다
    const { roomId: existingRoomId } = await getInvitePreview(code);
    if (await isMemberOf(existingRoomId, await readMemberToken(existingRoomId))) {
      return Response.json({ roomId: existingRoomId });
    }
    const { roomId, token } = await joinRoom(code, profile);
    await setMemberCookie(roomId, token);
    return Response.json({ roomId });
  } catch (err) {
    return errorResponse(err);
  }
}
