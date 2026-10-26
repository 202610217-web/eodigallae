import { changePassword } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { currentPassword, newPassword } = changePasswordSchema.parse(await request.json());
    return Response.json(await changePassword(user, currentPassword, newPassword));
  } catch (err) {
    return errorResponse(err);
  }
}
