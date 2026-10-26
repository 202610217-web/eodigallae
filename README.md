# 어디갈래?

**취향은 모으고, 결정은 함께!** — 친구들이 여행 취향과 조건을 모으고, 후보를 비교하고, 다수결·룰렛·연타 게임으로 최종 결정을 내리는 모임 보드.

- Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Lucide 아이콘
- Neon PostgreSQL (`@neondatabase/serverless`) / 로컬 개발용 PGlite(내장 Postgres)
- 입력 검증: zod · 테스트: vitest + API 스모크 스크립트

## 빠른 시작

```bash
npm install
npm run dev          # http://localhost:3000
```

`DATABASE_URL` 없이 실행하면 **로컬 내장 DB(PGlite)** 를 자동으로 사용합니다. 데이터는 `.data/pglite/`에 저장되고 서버를 재시작해도 남습니다.
회원가입·로그인 후 처음 화면의 “데모 모임으로 둘러보기”를 누르면 가상 참가자 3명(민지·준호·서연)과 후보가 채워진 모임이 만들어집니다.

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm test` | 추천·필터링·결정 로직 단위 테스트 (vitest) |
| `npm run smoke` | **서버 실행 중**에 여러 참가자로 전체 흐름 검증 (`BASE_URL=http://localhost:3000` 기본) |
| `npm run db:migrate` | Neon DB에 `db/schema.sql` 적용 |
| `npm run lint` | ESLint |

## DB 설정 (Neon)

1. [Neon](https://neon.tech)에서 프로젝트를 만들고 **Connection string (Pooled)** 을 복사합니다.
2. `.env.local.example`을 `.env.local`로 복사하고 `DATABASE_URL`에 붙여넣습니다. (실제 값은 커밋하지 마세요. `.env*`는 gitignore 대상)
3. 스키마 적용: `npm run db:migrate`
4. `npm run dev` → 화면 아래에 “로컬 개발 DB(PGlite) 사용 중” 문구가 **사라지면** Neon에 연결된 것입니다.

### 데모 데이터 vs 실제 DB — 무엇이 다른가

| 구분 | 동작 |
| --- | --- |
| 로컬 PGlite (`DATABASE_URL` 없음) | Neon과 **같은 SQL**을 실행하는 실제 Postgres. 단, 이 PC의 서버 프로세스 하나에서만 공유됩니다. 같은 와이파이의 휴대폰으로 `http://<PC IP>:3000` 접속 시 다중 사용자 테스트 가능. |
| Neon (`DATABASE_URL` 있음) | 서버리스 인스턴스 여러 개가 같은 DB를 공유 → 배포 환경에서 실제 멀티 유저. |
| 데모 모임 (`/demo`) | 어느 DB를 쓰든 일반 모임과 똑같이 저장됩니다. 다만 가상 참가자 3명은 **토큰이 없는 봇**이라 투표·게임에 참여하지 않습니다(방장이 투표 마감 가능). |
| Vercel에서 `DATABASE_URL` 누락 | 로컬 DB로 몰래 동작하지 않고 “데이터베이스가 설정되지 않았어요” 오류를 반환합니다. |

> 이 저장소에서 검증한 것은 **로컬 PGlite** 기준입니다. Neon 연결은 연결 문자열이 없어 실제로 실행해보지 못했습니다. 같은 SQL을 쓰지만, 최초 연결 후 `npm run smoke`를 한 번 돌려 확인하세요.

## Vercel 배포

1. GitHub에 push → Vercel에서 Import.
2. Project Settings → Environment Variables에 `DATABASE_URL` 추가 (Production/Preview). Vercel의 Neon 통합을 쓰면 자동으로 들어갑니다.
3. 배포 전 로컬에서 `npm run db:migrate`로 스키마를 한 번 적용합니다.
4. 배포 후 `BASE_URL=https://<배포주소> npm run smoke`로 확인.

## 구조

```
db/schema.sql                    테이블 정의 (Room, Member, TastePreference, DecisionCard,
                                 MemberCondition, Candidate, Vote, BattleEntry, DecisionResult)
scripts/migrate.mjs              Neon 스키마 적용
scripts/smoke.mjs                다중 사용자 API 시나리오 검증 (28개)
src/lib/domain/                  ★ 순수 로직 (UI·DB와 무관, 테스트 대상)
  constants.ts                   취향·캐릭터·제외 조건·타이밍 상수
  evaluate.ts                    필수 조건 판정, 취향 점수(3/2/1), 추천 이유, 카드 상태
  decide.ts                      다수결 집계, 균등 추첨, 룰렛 각도, 연타 검증
  domain.test.ts                 단위 테스트
src/lib/validation.ts            zod 입력 스키마 (API 액션 전체)
src/lib/server/                  서버 전용 (import "server-only")
  db.ts                          Neon / PGlite 어댑터
  session.ts                     참여 토큰·로그인 세션 쿠키(httpOnly, DB엔 SHA-256 해시만), 초대 코드
  auth.ts                        회원 계정: 가입·로그인(scrypt), 참가자↔계정 연결, 다른 기기 참여 토큰 발급
src/proxy.ts                     로그인하지 않으면 모든 화면을 /login?next=… 로 보냄
  rooms.ts                       상태 조회·권한 검사·모든 액션 처리
src/app/api/...                  REST 라우트 (rooms, invite, demo, state, actions)
src/components/ui/               Button, StatusBadge, Sheet(바텀시트↔오른쪽 패널), EmptyState …
src/components/room/             RoomProvider(주기 조회), RoomHeader, MemberStatusList, DecisionCard,
                                 TasteRankPicker, ConditionForm, CandidateForm/List, ReasonList, ConfirmedPlan
src/components/decision/         DecisionFlow(공통 레이아웃), DecisionModePicker, VotingPanel,
                                 RoulettePanel, ClickBattlePanel, ResultReveal(공통 결과)
```

## 핵심 규칙

- **필수 조건**(예산, 제외 음식/활동/숙소 조건)에 걸리면 `조건 충돌`, 비용·특징 정보가 없거나('기타' 포함) 조건 미입력 참가자가 있으면 `확인 필요`. 추천 표시는 통과 후보만.
- 조건 충돌·확인 필요 후보도 **자동으로 빼지 않는다.** 방장이 결정을 시작할 때 이런 후보가 있으면 후보별 이유를 보여주는 검토 단계가 나오고, 방장이 이번 결정에서 뺄 후보를 고른다(`startDecision.excludeIds`). 투표·룰렛·쟁탈전 화면에도 각 후보의 이유가 함께 표시된다.
- 후보 등록에는 '모름'이 없고 비용·특징·실내/야외·분위기마다 **'기타'** 를 골라 내용을 직접 적는다(`candidates.notes`). 기타로 적은 비용·특징은 판정할 수 없으므로 `확인 필요`가 되고, 적은 내용이 이유에 그대로 나온다.
- **선호 조건**(실내/야외, 분위기, 원하는 점, 의견)은 참고 문구로만 표시, 점수·차단 없음.
- 취향 점수: 1순위 3점 · 2순위 2점 · 3순위 1점 합산. 순위는 참고용.
- 결정 시작 시점에 방장이 남긴 후보를 `pool`로 고정하고, 결정 중에는 후보·조건 수정을 잠급니다.
- 다수결: `(card, member, round)` 기본키로 1인 1표. 마감 전 득표수·타인 선택 비공개. 동점 → 동점 후보만 룰렛.
- 룰렛: 서버가 `crypto.randomInt`로 먼저 당첨을 정하고, 화면은 그 칸에서 멈추는 회전만 보여줌.
- 쟁탈전: 서버 시각 기준 3초 카운트다운 + 3초. 클라이언트는 0.3초마다 횟수 묶음을 보내고, 서버는
  구간 밖 입력 거절 · 초당 15회 상한 · 한 묶음은 최근 1초분까지만 인정. 키 자동 반복은 클라이언트에서 무시.
- 결과는 `(card, round)` 기본키로 중복 생성 불가, 확정은 조건부 UPDATE로 한 번만.
- 방장: 결정 시작/마감/룰렛/게임 시작/확정/카드 잠금/결정 취소·다시 정하기, 모든 후보 수정·삭제.
- 방장 넘기기(참가자 목록 → 관리): 다른 참가자 한 명에게 넘기면 나는 일반 참가자가 된다. 가상 참가자(데모 봇)에게는 불가.
- 참가자 내보내기: 결정 진행 중(결과 확정 대기 포함)인 카드가 없을 때만. 그 사람의 취향·조건·투표 기록은 삭제, 올린 후보는 유지. 초대 링크로 다시 참여할 수 있다.

## 구슬 레이스 (결정 방식)

- 후보 이름을 단 구슬이 장애물 맵(핀 → 깔때기 → 지그재그 경사로 → 범퍼)을 지나 떨어지고, 가장 먼저 결승선에 닿은 구슬이 당첨. 출발 자리는 시드로 무작위.
- 방장이 [구슬 출발] → **서버가 레이스를 끝까지 한 번 계산**(`src/lib/domain/marble.ts`, 외부 물리 엔진 없음, 20개 기준 2초 이내)해 움직임 기록을 `marble_races`에 저장하고 결과도 함께 저장한다.
- 모두 서버 시각 기준으로 3초 카운트다운 뒤 같은 기록을 재생한다. 재생 도중 들어온 사람은 `GET /api/rooms/{room}/marble/{card}`로 기록을 받아 지금 장면부터 본다.
- 재생이 끝날 때까지(`marble_running`) 상태 응답에 결과를 넣지 않고 확정도 막는다. 끝나면 결과 공개(`result`). 끝난 뒤 들어온 사람은 기록을 받을 수 없어 결과만 본다.
- 경주 길이는 보통 25~35초, 기록 크기는 구슬 수에 따라 약 20~180KB. 다시 정하기 하면 이전 기록은 지운다.
- 아이디어는 lazygyu/roulette(MIT)에서 왔지만 코드는 새로 작성했고, 'Marble Roulette/마블 룰렛' 이름은 상표라 쓰지 않는다.

## 결정 카드 만들기

- 예시 카드 없이 방장이 카드를 직접 만든다: 이름 + 아이콘(`CARD_ICONS`) + 일차·시간. 이름을 입력하면 맞는 아이콘을 미리 골라 두고, 방장이 바꿀 수 있다.
- 아이콘마다 종류(식사·활동·숙소)가 정해져 있고, 그 종류가 카드 종류가 된다 → 조건 입력 항목(못 먹는 음식/참여 불가 활동/숙소 조건)과 일정표(숙소는 따로)에 쓰인다.

## 일정표

- 결정 카드마다 일차(`day`)와 시작 시각(`start_time`, HH:MM)을 정한다. 모임 만들 때 제목의 시간대 단어(아침·점심·오후·저녁·밤 등)로 기본값을 채우고, 방장이 카드 상세에서 바꿀 수 있다(`setCardSchedule`).
- 모든 카드가 확정되면 '확정된 일정'이 **여행 일정표**로 바뀐다: 숙소를 뺀 식사·활동을 일차별로 시간순 정렬, 숙소는 따로 표시. 일차·시간이 없는 카드는 뒤로.

## 회원 계정 (로그인 필수)

- 로그인해야 처음 화면을 포함한 모든 화면을 볼 수 있다. 로그인하지 않으면 `src/proxy.ts`가 `/login`으로 보내고, 초대 링크 등 원래 주소는 `?next=`로 기억했다가 로그인 후 돌아간다.
- 모임 만들기·데모·초대 참여 API도 로그인을 요구한다(`LOGIN_REQUIRED`). 계정 도입 전에 비회원으로 참여한 참가자는 기존 쿠키로 계속 쓸 수 있다.
- 아이디(영문 소문자·숫자·_ 4~20자) + 비밀번호(8자 이상). 모임 안에서는 여전히 모임별 닉네임을 쓴다.
- 가입·로그인하면 이 브라우저로 참여했던 모임이 계정에 연결되고, 홈에 "내 모임" 목록이 생긴다. 로그인 상태로 만든·참여한 모임은 자동 연결.
- 다른 기기에서 로그인하면 그 기기에 참여 토큰을 새로 발급(`member_tokens`)해 같은 참가자로 들어간다. 기존 기기의 토큰은 그대로 유효.
- 로그아웃하면 세션과 함께, 그 브라우저에 남은 "계정에 연결된" 모임 쿠키·추가 토큰도 지운다.
- 비밀번호는 scrypt(솔트 포함)로만 저장. 로그인 실패는 아이디 존재 여부를 구분하지 않는다.

## 실시간 동기화

WebSocket 대신 **주기적 조회**: 평소 3초, 쟁탈전·집계 중 1초, 탭이 숨겨지면 중지. 모든 변경은 서버에 먼저 저장된 뒤 재조회됩니다.

## 남은 작업 / 알려진 한계

- Neon 실제 연결 검증 (연결 문자열 필요).
- 참가자가 스스로 나가는 기능 없음(방장이 내보내기는 가능). 내보낸 사람의 재참여를 막는 기능 없음.
- 비밀번호 찾기·변경, 회원 탈퇴, 로그인 시도 횟수 제한 없음.
- 요청 빈도 제한(rate limit) 없음.
- 주기 조회 방식이라 반영까지 최대 약 3초 지연.
- 결정 카드 이름·날짜 수정 UI 없음(생성 시에만 설정).
