import { logOut } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";

export async function POST() {
  try {
    await logOut();
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
