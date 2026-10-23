import "server-only";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { AppError } from "./errors";

// DATABASE_URL이 있으면 Neon(서버리스 HTTP), 없으면 로컬 개발용 PGlite(내장 Postgres)를 쓴다.
// 두 경우 모두 같은 SQL을 실행하므로 로컬에서 검증한 로직이 Neon에서도 그대로 동작한다.

export type Row = Record<string, unknown>;
export interface Query {
  text: string;
  params?: unknown[];
}

export interface Db {
  kind: "neon" | "local";
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** 여러 조회를 한 번에 실행. Neon에서는 HTTP 요청 한 번으로 묶인다. */
  batch(queries: Query[]): Promise<Row[][]>;
}

function createNeonDb(url: string): Db {
  const sql = neon(url);
  return {
    kind: "neon",
    async query<T extends Row>(text: string, params: unknown[] = []) {
      return (await sql.query(text, params)) as T[];
    },
    async batch(queries) {
      if (queries.length === 0) return [];
      return (await sql.transaction(queries.map((q) => sql.query(q.text, q.params ?? [])))) as Row[][];
    },
  };
}

async function createLocalDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.LOCAL_DB_DIR || path.join(process.cwd(), ".data", "pglite");
  const inMemory = dataDir === ":memory:";
  if (!inMemory) await mkdir(dataDir, { recursive: true });
  const pg = new PGlite(inMemory ? undefined : dataDir);
  const schema = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await pg.exec(schema);
  return {
    kind: "local",
    async query<T extends Row>(text: string, params: unknown[] = []) {
      return (await pg.query<T>(text, params)).rows;
    },
    async batch(queries) {
      const out: Row[][] = [];
      for (const q of queries) out.push((await pg.query<Row>(q.text, q.params ?? [])).rows);
      return out;
    },
  };
}

const globalForDb = globalThis as unknown as { __edgDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__edgDb) {
    const url = process.env.DATABASE_URL;
    if (url) {
      globalForDb.__edgDb = Promise.resolve(createNeonDb(url));
    } else if (process.env.VERCEL) {
      // 서버리스 배포에서는 로컬 파일 DB가 인스턴스마다 달라 다중 사용자 기능이 깨진다.
      return Promise.reject(
        new AppError(500, "서버에 데이터베이스가 설정되지 않았어요. 관리자에게 DATABASE_URL 설정을 요청해주세요."),
      );
    } else {
      globalForDb.__edgDb = createLocalDb().catch((err) => {
        globalForDb.__edgDb = undefined;
        throw err;
      });
    }
  }
  return globalForDb.__edgDb;
}
