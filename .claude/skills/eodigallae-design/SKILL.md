---
name: eodigallae-design
description: 「어디갈래?」 앱의 디자인 시스템(색상 토큰, 글꼴, 간격, 컴포넌트, 상태 표시, 애니메이션, 문구 톤). 이 프로젝트에서 화면·컴포넌트를 새로 만들거나 고칠 때, 스타일·색·레이아웃·문구를 정할 때 반드시 먼저 읽는다.
---

# 어디갈래? 디자인 시스템

따뜻한 크림 배경 위에 흰 카드, 코랄 포인트, 진한 남색 글자. 친구끼리 쓰는 앱이라 다정하고 가볍지만, 상태와 다음 행동은 분명하게 보여준다. **모바일 우선**(기본 화면은 휴대폰, `md:`부터 데스크톱 보강).

새 UI를 만들 때 순서:
1. `src/components/ui/`에 이미 있는 컴포넌트를 먼저 쓴다 (아래 목록).
2. 없으면 아래 토큰과 패턴으로 만든다. 임의의 hex 색·새 그림자·새 둥글기를 만들지 않는다.
3. 두 곳 이상에서 쓰이면 `src/components/ui/`로 옮긴다.

## 색상 토큰 (`src/app/globals.css`의 `@theme`)

Tailwind 클래스로 쓴다: `bg-cream`, `text-ink-soft`, `border-line` 등.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `cream` | #f5f1ea | 페이지 배경, 카드 안 작은 정보 상자 |
| `cream-deep` | #ece6db | 세그먼트 배경, 진행 막대 바탕, ghost 버튼 hover, 비활성 입력 |
| `line` | #e6e0d5 | 테두리, 구분선 |
| `white` | — | 카드, 입력창, secondary 버튼, 하단 고정 바 |
| `ink` | #252d3b | 본문·제목 |
| `ink-soft` | #545e70 | 보조 설명, 아이콘 |
| `ink-faint` | #6f7786 | placeholder, 힌트, 비활성 글자, 화살표 아이콘 (흰 배경 대비 4.5:1) |
| `coral` | #ff755e | 포인트(진행 막대, 포커스 테두리, 로딩 아이콘). **흰 글자 배경으로 쓰지 않음** |
| `coral-strong` | #d0432d | 주요 버튼 배경, 순위 숫자, 포커스 outline, 로고 (흰 글자 대비 4.6:1) |
| `coral-soft` | #ffe9e4 | 선택된 칩 배경, 빈 화면 아이콘 배경 |
| `success` / `success-ink` | #e6f4ea / #1d7442 | 통과·확정 |
| `info` / `info-ink` | #e8f0ff / #2a59c2 | 수집 중, 안내 |
| `warning` / `warning-ink` | #fff1d6 / #8f5c05 | 확인 필요, 후보 확인 |
| `danger` / `danger-ink` | #fde9e6 / #bf3427 | 충돌, 오류, 제외 |

- 상태 색은 항상 **연한 배경 + 같은 계열 진한 글자** 짝으로 쓴다 (`bg-warning text-warning-ink`).
- 코드에 이미 있는 예외 hex(이것만 허용): 주요 버튼 hover `#b93a26`, 비활성 `#f2b3a8`, 코랄 칩 글자 `#b9412c`, success 버튼 hover `#165e35`, danger 테두리 `#f3c4bd`, 확정 카드 테두리 `#bfe2cb`, 왕관 `#FFC93C`/`#B7860B`. 새 색이 필요하면 `@theme`에 토큰으로 추가한다.
- 참가자 색은 `src/lib/domain/constants.ts`의 `colorHex()`로만 쓴다 (배경은 hex + `26` 투명도).
- 다크 모드는 없다. 만들지 않는다.

## 글꼴과 글자

- 글꼴: Pretendard Variable (`layout.tsx`에서 CDN 로드, `--font-sans`). 따로 지정하지 않는다.
- 본문 기본 `text-[15px] leading-relaxed` (body에 적용됨). `word-break: keep-all`이 전역에 있어 한국어가 단어 단위로 줄바꿈된다.

| 쓰임 | 클래스 |
| --- | --- |
| 페이지 제목 h1 | `text-2xl font-extrabold md:text-[28px]` (홈은 `text-[28px] leading-tight font-extrabold`) |
| 시트 제목 | `text-lg font-bold leading-snug md:text-xl` |
| 카드 제목 h3 | `text-lg font-bold leading-snug` |
| 강조 값 | `text-base font-bold` |
| 라벨 | `text-sm font-bold` |
| 보조 설명 | `text-sm text-ink-soft` |
| 작은 캡션·dt | `text-xs text-ink-soft` |
| 배지·칩 | `text-[13px] font-semibold` |

## 모양·간격

- 둥글기: 카드 `rounded-[var(--radius-card)]`(16px) · 입력/버튼/정보 상자/Notice `rounded-xl` · 작은 버튼·세그먼트 항목 `rounded-lg` · 아이콘 상자 `rounded-xl`/`rounded-2xl` · 칩·배지·진행 막대 `rounded-full` · 시트 `rounded-t-3xl`(모바일) / `md:rounded-l-3xl`.
- 그림자는 거의 쓰지 않는다. 구분은 **크림 배경 위 흰 카드**와 `border-line`으로. 예외: 선택된 세그먼트 `shadow-sm`.
- 카드 패딩 `p-4`(목록 카드) / `p-5`(단독 섹션). 페이지 좌우 `px-4`.
- 레이아웃 폭: 시작·생성·참여 화면은 `PageShell`(`max-w-xl`), 홈은 `max-w-md md:max-w-lg lg:max-w-5xl`(넓은 화면 두 칸, 배치는 `src/app/HomeLayout.tsx`).
- 그리드 열은 `grid-cols-1`처럼 명시한다. 열 정의 없는 그리드는 긴 글자(`truncate`)가 칸을 밀어 가로 스크롤이 생긴다.
- **터치 영역 최소 44px**: 버튼·칩·아이콘 버튼은 `min-h-11` 또는 `size-11` 이상. 입력창은 `min-h-12`.

## 컴포넌트 (먼저 재사용)

| 파일 | 내용 |
| --- | --- |
| `ui/Button.tsx` | `variant`: primary(코랄) · secondary(흰+테두리) · ghost · danger · success / `size`: sm·md·lg / `loading`, `icon`, `block` |
| `ui/Field.tsx` | `Label`(hint 가능), `TextInput`, `TextArea`, `Segmented`(단일 선택), `ToggleChip`(다중 선택, tone coral/danger), `FieldError` |
| `ui/StatusBadge.tsx` | `Pill`(tone별 배지), `StatusBadge`, `CheckBadge`, `LockedBadge`, `WaitingBadge` |
| `ui/States.tsx` | `EmptyState`, `LoadingState`, `ErrorState`, `Notice`(info/warning/danger/success 안내 상자) |
| `ui/Sheet.tsx` | 모바일 바텀시트 ↔ md 이상 오른쪽 패널. `size="wide"`, `footer`. 모달은 이것만 쓴다 |
| `ui/BottomActionBar.tsx` | 모바일 하단 고정 주요 행동 (md 이상에서는 일반 흐름) |
| `ui/Avatar.tsx` | 동물 캐릭터 + 참가자 색, `crown`, `style`(애니메이션 변수용) |
| `ui/TasteChip.tsx` | 취향 칩·태그 (순위 숫자는 코랄) |
| `PageShell.tsx` | 좁은 단일 열 페이지 + "처음으로" 링크 |

- 클래스 합치기는 `cn()` (`@/lib/client/cn`). clsx/tailwind-merge를 새로 들이지 않는다.
- 아이콘은 **lucide-react만**. 장식 아이콘은 `aria-hidden`, 크기는 `size-3.5`(배지) / `size-4`(버튼) / `size-5`(카드·헤더).

## 자주 쓰는 패턴

- 흰 카드: `rounded-[var(--radius-card)] bg-white p-4` (눌리는 카드는 `border border-transparent hover:border-ink-faint transition-colors`, 오른쪽에 `ChevronRight text-ink-faint`).
- 카드 안 작은 정보 상자: `rounded-xl bg-cream px-3 py-2` + `dt text-xs text-ink-soft` / `dd font-bold`.
- 진행 막대: 바탕 `h-1.5 rounded-full bg-cream-deep`, 채움 `bg-coral transition-[width] duration-500`.
- 아이콘 상자: `flex size-10 items-center justify-center rounded-xl bg-cream text-ink`.
- 확정 결과 상자: `rounded-xl bg-success px-3 py-2.5`.

## 상태 표시 규칙

- **색만으로 구분하지 않는다.** 상태에는 항상 아이콘 + 한국어 문구를 같이 쓴다 (`Pill`/`StatusBadge` 사용).
- 카드 단계: 조건 수집 중(info) → 후보 확인(warning) → 결정 중(coral) → 확정(success).
- 후보 판정: 필수 조건 통과(success) / 확인 필요(warning) / 조건 충돌(danger).
- 빈 화면에는 반드시 다음 행동을 알려준다 (`EmptyState`의 `description`·`action`).

## 움직임

`globals.css`에 정의된 것만 쓴다: `animate-rise-in`, `animate-pop`, `animate-gather`, `animate-count`, `animate-crown`, `animate-confirm`, `animate-sheet-up`/`sheet-left`, `animate-fade`.
- 목록이 차례로 나타날 때: `className="stagger"` + `style={{ "--i": index }}`.
- 룰렛 회전은 `.roulette-wheel`.
- `prefers-reduced-motion`은 전역에서 처리된다. 새 애니메이션은 `@theme`에 추가해 이 규칙을 따르게 한다.

## 접근성

- 포커스는 전역 `:focus-visible`(코랄 outline). 입력은 `TextInput`이 2px `coral-strong` 테두리로 처리하고, `aria-invalid`면 테두리가 `danger-ink`가 된다.
- 흰 글자는 `coral-strong` 이상 진한 배경에만 올린다(4.5:1). 새 색을 고를 때도 본문·placeholder 4.5:1을 지킨다.
- 선택형은 `role="radio"`/`aria-checked` 또는 `aria-pressed`, 로딩 버튼은 `aria-busy`, 오류는 `role="alert"`.
- 아이콘만 있는 버튼에는 `aria-label`.

## 문구 톤

- 다정한 해요체: "내 조건을 입력해주세요", "조건을 만족하는 후보가 없어요", "불러오는 중이에요".
- 짧고 구체적으로, 다음에 할 일을 말한다. 기술 용어(토큰, 서버, DB) 대신 사용자 말로.
- 상태 이름은 위 목록의 표현을 그대로 쓴다 (예: "조건 충돌", "확인 필요"는 바꾸지 않는다).
