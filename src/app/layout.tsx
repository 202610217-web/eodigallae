import type { Metadata, Viewport } from "next";
import { ConfirmDialogHost } from "@/components/ui/ConfirmDialog";
import "./globals.css";

export const metadata: Metadata = {
  title: "어디갈래? — 취향은 모으고, 결정은 함께!",
  description: "친구들과 일정마다 의견을 모으고, 후보를 올리고, 게임으로 함께 결정하는 여행 모임 보드",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F1EA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard (한국어 가독성). 불러오지 못하면 시스템 한글 글꼴로 대체된다. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col text-[15px] leading-relaxed">
        {children}
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
