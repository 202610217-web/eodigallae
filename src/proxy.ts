import { NextResponse, type NextRequest } from "next/server";
import { userFromSessionToken } from "@/lib/server/auth";
import { SESSION_COOKIE } from "@/lib/server/session";

// 모든 화면은 로그인해야 볼 수 있다. 로그인하지 않았으면 로그인 화면으로 보내고,
// 로그인 후 원래 가려던 주소(초대 링크 등)로 돌아오게 next를 붙인다.
// API는 여기서 막지 않고 각 라우트가 직접 검사한다(모임 생성·참여는 requireUser).

const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await userFromSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const onAuthPage = AUTH_PAGES.includes(pathname);

  if (!user && !onAuthPage) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (user && onAuthPage) {
    const next = request.nextUrl.searchParams.get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(new URL(safe, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // API, 정적 파일, 이미지 등은 제외
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
