import { logOutOtherDevices } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";

// 이 기기를 뺀 다른 기기의 로그인을 모두 끝낸다
export async function POST() {
  try {
    return Response.json(await logOutOtherDevices(await requireUser()));
  } catch (err) {
    return errorResponse(err);
  }
}
