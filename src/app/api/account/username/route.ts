import { changeUsername, getAccount } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { changeUsernameSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { username, password } = changeUsernameSchema.parse(await request.json());
    await changeUsername(user, username, password);
    return Response.json({ account: await getAccount(user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}
