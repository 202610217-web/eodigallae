import { getCurrentUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { createDemoRoom } from "@/lib/server/rooms";
import { setMemberCookie } from "@/lib/server/session";
import { profileSchema } from "@/lib/validation";

// 가상 참가자·후보가 미리 채워진 체험용 모임. 데이터는 일반 모임과 같은 DB에 저장된다.
export async function POST(request: Request) {
  try {
    const host = profileSchema.parse(await request.json());
    const user = await getCurrentUser();
    const { roomId, token } = await createDemoRoom(host, user?.id ?? null);
    await setMemberCookie(roomId, token);
    return Response.json({ roomId });
  } catch (err) {
    return errorResponse(err);
  }
}
