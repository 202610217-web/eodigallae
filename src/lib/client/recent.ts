// 이 브라우저에서 들어갔던 모임 목록 (편의 기능). 저장소를 쓸 수 없어도 화면은 정상 동작한다.

const KEY = "edg:recentRooms";

export interface RecentRoom {
  id: string;
  name: string;
  at: number;
}

export function readRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentRoom[]) : [];
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
}

/** 변경 감지용 원문 문자열 (useSyncExternalStore 스냅샷) */
export function recentRoomsSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberRoom(id: string, name: string) {
  try {
    const list = readRecentRooms().filter((r) => r.id !== id);
    localStorage.setItem(KEY, JSON.stringify([{ id, name, at: Date.now() }, ...list].slice(0, 5)));
  } catch {
    // 저장하지 못해도 무시
  }
}
