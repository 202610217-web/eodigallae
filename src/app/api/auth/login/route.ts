import { logIn } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { authSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = authSchema.safeParse(await request.json());
    // 형식이 틀린 아이디·비밀번호도 "올바르지 않아요"로만 답해 가입 규칙을 단서로 주지 않는다
    if (!parsed.success) return Response.json({ error: "아이디 또는 비밀번호가 올바르지 않아요.", code: "BAD_CREDENTIALS" }, { status: 401 });
    const user = await logIn(parsed.data.username, parsed.data.password);
    return Response.json({ user: { username: user.username } });
  } catch (err) {
    return errorResponse(err);
  }
}
