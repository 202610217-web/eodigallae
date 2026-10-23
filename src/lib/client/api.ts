// 클라이언트에서 서버 API를 부를 때 쓰는 얇은 래퍼. 오류는 서버가 준 한국어 메시지로 변환한다.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "네트워크에 연결할 수 없어요. 인터넷 연결을 확인해주세요.");
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.", data?.code);
  }
  return data as T;
}
