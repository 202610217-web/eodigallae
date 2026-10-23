// Neon DB에 db/schema.sql을 적용한다. 사용법: npm run db:migrate
// .env.local의 DATABASE_URL을 읽는다. (로컬 PGlite는 서버 시작 시 자동 적용되므로 필요 없음)
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL이 없습니다. .env.local.example을 참고해 .env.local에 설정해주세요.");
  process.exit(1);
}

const statements = readFileSync("db/schema.sql", "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const sql = neon(url);
for (const statement of statements) {
  await sql.query(statement);
  console.log("✓", statement.split("\n")[0]);
}
console.log(`스키마 적용 완료 (${statements.length}개 문장)`);
