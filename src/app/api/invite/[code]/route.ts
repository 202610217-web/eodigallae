import { resolveMemberToken } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { getInvitePreview, isMemberOf } from "@/lib/server/rooms";
import { normalizeInviteCode } from "@/lib/server/session";

export async function GET(_request: Request, ctx: RouteContext<"/api/invite/[code]">) {
  try {
    const { code } = await ctx.params;
    const preview = await getInvitePreview(normalizeInviteCode(code));
    const alreadyMember = await isMemberOf(preview.roomId, await resolveMemberToken(preview.roomId));
    return Response.json({ ...preview, alreadyMember });
  } catch (err) {
    return errorResponse(err);
  }
}
