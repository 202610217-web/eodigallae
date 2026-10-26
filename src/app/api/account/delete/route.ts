import { deleteAccount } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { passwordConfirmSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { password } = passwordConfirmSchema.parse(await request.json());
    await deleteAccount(user, password);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
