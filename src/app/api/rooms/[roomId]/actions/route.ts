import { resolveMemberToken } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { performAction } from "@/lib/server/rooms";
import { actionSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[roomId]/actions">) {
  try {
    const { roomId } = await ctx.params;
    const action = actionSchema.parse(await request.json());
    await performAction(roomId, await resolveMemberToken(roomId), action);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
