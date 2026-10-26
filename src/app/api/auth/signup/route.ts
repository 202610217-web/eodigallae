import { signUp } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { authSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { username, password } = authSchema.parse(await request.json());
    const user = await signUp(username, password);
    return Response.json({ user: { username: user.username } });
  } catch (err) {
    return errorResponse(err);
  }
}
