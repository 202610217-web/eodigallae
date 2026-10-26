import { requireUser, resolveMemberToken } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { isMemberOf, joinRoom, getInvitePreview } from "@/lib/server/rooms";
import { normalizeInviteCode, setMemberCookie } from "@/lib/server/session";
import { joinSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/invite/[code]/join">) {
  try {
    const user = await requireUser();
    const code = normalizeInviteCode((await ctx.params).code);
    const profile = joinSchema.parse(await request.json());
    // 이미 이 브라우저(또는 로그인한 계정)로 참여한 모임이면 새 참가자를 만들지 않는다
    const { roomId: existingRoomId } = await getInvitePreview(code);
    if (await isMemberOf(existingRoomId, await resolveMemberToken(existingRoomId))) {
      return Response.json({ roomId: existingRoomId });
    }
    const { roomId, token } = await joinRoom(code, profile, user.id);
    await setMemberCookie(roomId, token);
    return Response.json({ roomId });
  } catch (err) {
    return errorResponse(err);
  }
}
