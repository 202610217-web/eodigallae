import { getAccount, updateProfile } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { profileSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await updateProfile(user, profileSchema.parse(await request.json()));
    return Response.json({ account: await getAccount(user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}
