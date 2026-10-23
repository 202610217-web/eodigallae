import "server-only";
import { ZodError } from "zod";

/** 사용자에게 그대로 보여줄 수 있는 한국어 메시지를 담는 오류 */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json({ error: err.message, code: err.code }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return Response.json({ error: first?.message || "입력 값을 다시 확인해주세요." }, { status: 400 });
  }
  console.error(err);
  return Response.json({ error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
}
