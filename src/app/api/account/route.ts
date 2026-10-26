import { getAccount } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";

// 내 프로필·계정 정보 (설정 화면, 오른쪽 위 프로필 메뉴)
export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ account: await getAccount(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
