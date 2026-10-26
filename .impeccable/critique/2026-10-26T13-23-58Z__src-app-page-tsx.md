---
target: 홈 화면
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\lhsnk\\Desktop\\eodigallae\\src\\app\\page.tsx"
target_fingerprint: "sha256:fa523107cecdb5fcb5c1ceb12f9fd6c42d17413fac5a6596a1353b29a110e729"
target_path: "C:\\Users\\lhsnk\\Desktop\\eodigallae\\src\\app\\page.tsx"
timestamp: 2026-10-26T13-23-58Z
slug: src-app-page-tsx
---
# 홈 화면 디자인 비평 (src/app/page.tsx)

## 점수: 25/40 (Acceptable)
| # | 휴리스틱 | 점수 | 핵심 문제 |
|---|---|---|---|
| 1 | 상태 표시 | 2 | AccountPanel이 로딩·실패 시 null (AccountPanel.tsx:37), 스켈레톤·재시도 없음 |
| 2 | 현실 세계와 일치 | 3 | 날짜가 2026-11-20 그대로, 빨간 점 설명 없음 |
| 3 | 사용자 통제 | 3 | 틀린 6자리 코드는 페이지 이동 후에야 오류, 입력값 사라짐 |
| 4 | 일관성 | 2 | coral/coral-strong 혼용, EmptyState 미사용, /join "가입 없이" 문구가 로그인 필수와 모순 |
| 5 | 오류 예방 | 2 | maxLength·autoCapitalize·inputMode 없음 |
| 6 | 기억보다 인식 | 3 | 모임 목록에 진행 단계 표시 없음 |
| 7 | 유연성·효율 | 2 | 재방문자가 모바일에서 맨 아래까지 스크롤해야 내 모임 |
| 8 | 미니멀 디자인 | 3 | 깔끔, 데스크톱 빈 상태는 미완성처럼 보임 |
| 9 | 오류 복구 | 3 | 문구는 명확, aria-invalid/describedby 없음 |
| 10 | 도움말 | 2 | 데모 링크만 있음, 흐름 미리보기 없음 |

## 디자인 고유성
대체로 범용 앱 허브 템플릿. 결정 방식 4종·동물 캐릭터·조건 비교 같은 제품 고유 요소가 홈에 없음. 설명 문구에 구슬 레이스 빠짐.
검출기: 소스 스캔 0건(정규식만 동작). 브라우저 스캔: coral-strong(#e9553d) 위 흰 글자 3.6:1, 부제 3.0:1 대비 부족 3건 실제. placeholder 3.1:1(권고). bounce-easing은 홈에서 쓰이지 않는 전역 CSS, cream-palette는 의도된 토큰, text-occlusion은 오버레이 자체 오탐.

## 우선 문제
- [P1] 긴 모임 이름으로 모바일 가로 넘침: main 그리드에 열 정의가 없어 truncate가 동작 안 함. 390px에서 29자 이름도 넘침. 수정: grid-cols-1 또는 min-w-0. (harden)
- [P1] 재방문자 정보 구조: 내 모임이 모바일 맨 아래, 제목이 작은 캡션, 진행 상태 없음. 수정: 이어서 하기 카드, 제목 키우기, formatTrip. (layout)
- [P2] 주요 버튼 대비 부족 + ProfileMenu 접근성: 흰색/#e9553d 3.6:1, Esc 시 포커스 유실, role=menu에 화살표 키 없음. (audit → harden)
- [P2] 내 모임 로딩/오류/빈 상태 없음, 틀린 코드는 페이지 이동 후 오류. (harden)
- [P2] 제품 특징 없는 범용 허브: 흐름 띠(조건→비교→함께 결정→일정표)나 캐릭터로 정체성 표현. (bolder/delight)

## 페르소나
- 처음 쓰는 사람: 빨간 점 의미 불명, 모임 안에 뭐가 있는지 설명 없음, /join의 "가입 없이" 모순
- 한 손 모바일: 가로 흔들림, 내 모임까지 스크롤, 코드 입력 자동수정
- 키보드/스크린리더: 메뉴 Esc 후 포커스 유실, 상태 아이콘 읽히지 않음
- 발표 청중: 1280에서 빈 상태가 미완성처럼 보임, 데모 링크가 작은 회색 글씨, 개발 모드 배지 겹침

## 기타
page.tsx:22 설명 문구, 프로필 행 음수 마진 정렬, 모임 행 hover 없음, 정렬 없음

## 질문
- 내 모임이 재방문자에게 가장 중요한데 왜 폰에서 맨 아래인가?
- 홈 상단이 로그인 화면 문구를 반복하는 대신 진행 흐름을 보여주면?
- 초대는 링크로 오는데 홈에 코드 입력칸이 이만큼 커야 하나?
