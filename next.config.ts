import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 개발 서버(next dev -H 0.0.0.0)에 같은 네트워크의 휴대폰 등이 http://<PC IP>:3000 으로 접속할 수 있게
  // 사설 IP 대역을 허용한다. 허용하지 않으면 화면은 뜨지만 개발용 스크립트가 막혀 버튼이 동작하지 않는다. (배포에는 영향 없음)
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  partialPrefetching: true,
  // 로컬 개발용 내장 Postgres(WASM)는 번들하지 않고 Node에서 그대로 불러온다
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
