import { resetPassword } from "@/lib/server/account";
import { errorResponse } from "@/lib/server/errors";
import { resetPasswordSchema } from "@/lib/validation";

// 비밀번호를 잊었을 때: 아이디 + 복구 코드 + 새 비밀번호. 성공하면 이 기기로 로그인된다.
export async function POST(request: Request) {
  try {
    const { username, recoveryCode, newPassword } = resetPasswordSchema.parse(await request.json());
    const user = await resetPassword(username, recoveryCode, newPassword);
    return Response.json({ user: { username: user.username } });
  } catch (err) {
    return errorResponse(err);
  }
}
