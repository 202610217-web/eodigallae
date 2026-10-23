import { errorResponse } from "@/lib/server/errors";
import { createRoom } from "@/lib/server/rooms";
import { setMemberCookie } from "@/lib/server/session";
import { createRoomSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = createRoomSchema.parse(await request.json());
    const { roomId, token, inviteCode } = await createRoom(input);
    await setMemberCookie(roomId, token);
    return Response.json({ roomId, inviteCode });
  } catch (err) {
    return errorResponse(err);
  }
}
