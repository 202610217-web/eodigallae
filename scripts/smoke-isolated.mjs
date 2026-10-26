// 공유 DB를 건드리지 않고 스모크 테스트를 돌린다. 사용법: npm run smoke  (이미 빌드했으면 npm run smoke -- --no-build)
// 1) DATABASE_URL을 빈 값으로 두고 빌드 → 2) 빈 포트에 next start (내장 PGlite, 메모리에만 저장)
// 3) scripts/smoke.mjs 실행 → 4) 서버 종료. 테스트 계정·모임은 서버가 꺼지면 함께 사라진다.
// DATABASE_URL을 빈 값으로 두면 .env.local의 값을 덮지 않아(@next/env는 이미 있는 값을 유지) 앱이 PGlite를 쓴다.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules/next/dist/bin/next");
const env = { ...process.env, DATABASE_URL: "", LOCAL_DB_DIR: ":memory:", NEXT_TELEMETRY_DISABLED: "1" };

function run(args, opts = {}) {
  return spawn(process.execPath, args, { cwd: root, env, stdio: "inherit", ...opts });
}

function exitCode(child) {
  return new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitReady(base, ms = 60_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(`${base}/login`)).ok) return;
    } catch {
      // 아직 뜨는 중
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("테스트 서버가 시간 안에 뜨지 않았어요.");
}

if (!process.argv.includes("--no-build")) {
  console.log("▶ 빌드 (테스트용 내장 DB 설정)");
  const code = await exitCode(run([nextBin, "build"]));
  if (code !== 0) process.exit(code);
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
console.log(`▶ 테스트 서버 시작 ${base} (내장 PGlite, 메모리 전용)`);
const server = run([nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: ["ignore", "ignore", "inherit"] });
const stop = () => {
  if (server.exitCode === null) server.kill();
};
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});

let code = 1;
try {
  await waitReady(base);
  code = await exitCode(run([path.join(root, "scripts/smoke.mjs")], { env: { ...env, BASE_URL: base, SMOKE_ISOLATED: "1" } }));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
} finally {
  stop();
}
process.exit(code);
