import { createRecoveryCode } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { passwordConfirmSchema } from "@/lib/validation";

// 비밀번호 재설정용 복구 코드 발급. 원문은 이 응답에서만 볼 수 있다.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { password } = passwordConfirmSchema.parse(await request.json());
    return Response.json({ code: await createRecoveryCode(user, password) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
