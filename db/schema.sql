-- 어디갈래? 스키마. 여러 번 실행해도 안전하도록 IF NOT EXISTS 사용.
-- 시간 값은 앱 서버 기준 epoch ms (double precision)로 저장한다.

CREATE TABLE IF NOT EXISTS rooms (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  trip_start      text NOT NULL,
  trip_end        text,
  invite_code     text NOT NULL UNIQUE,
  is_demo         boolean NOT NULL DEFAULT false,
  created_at      double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id              text PRIMARY KEY,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname        text NOT NULL,
  character       text NOT NULL,
  color           text NOT NULL,
  is_host         boolean NOT NULL DEFAULT false,
  -- 참여 토큰 원문은 저장하지 않고 SHA-256 해시만 저장. 데모 봇은 NULL.
  token_hash      text UNIQUE,
  joined_at       double precision NOT NULL,
  UNIQUE (room_id, nickname)
);
CREATE INDEX IF NOT EXISTS members_room_idx ON members(room_id);

CREATE TABLE IF NOT EXISTS taste_preferences (
  member_id       text PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  rank1           text NOT NULL,
  rank2           text NOT NULL,
  rank3           text NOT NULL,
  updated_at      double precision NOT NULL,
  CHECK (rank1 <> rank2 AND rank1 <> rank3 AND rank2 <> rank3)
);

CREATE TABLE IF NOT EXISTS decision_cards (
  id                text PRIMARY KEY,
  room_id           text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title             text NOT NULL,
  category          text NOT NULL,
  sort_order        integer NOT NULL,
  stage             text NOT NULL DEFAULT 'open',   -- open | deciding | confirmed
  mode              text,                           -- vote | roulette | battle
  phase             text,
  round             integer NOT NULL DEFAULT 1,
  locked            boolean NOT NULL DEFAULT false,
  pool              jsonb NOT NULL DEFAULT '[]'::jsonb,
  tie_ids           jsonb NOT NULL DEFAULT '[]'::jsonb,
  phase_started_at  double precision,
  battle_winner_id  text,
  updated_at        double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS cards_room_idx ON decision_cards(room_id);

CREATE TABLE IF NOT EXISTS member_conditions (
  card_id         text NOT NULL REFERENCES decision_cards(id) ON DELETE CASCADE,
  member_id       text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  max_budget      integer,
  restrictions    jsonb NOT NULL DEFAULT '[]'::jsonb,
  setting         text NOT NULL DEFAULT 'any',
  vibe            text NOT NULL DEFAULT 'any',
  wish            text NOT NULL DEFAULT '',
  note            text NOT NULL DEFAULT '',
  ready           boolean NOT NULL DEFAULT false,
  updated_at      double precision NOT NULL,
  PRIMARY KEY (card_id, member_id)
);
CREATE INDEX IF NOT EXISTS conditions_room_idx ON member_conditions(room_id);

CREATE TABLE IF NOT EXISTS candidates (
  id              text PRIMARY KEY,
  card_id         text NOT NULL REFERENCES decision_cards(id) ON DELETE CASCADE,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by      text NOT NULL,
  name            text NOT NULL,
  cost            integer,
  tags            jsonb NOT NULL DEFAULT '[]'::jsonb,
  features        jsonb,                          -- NULL = 정보 없음
  setting         text NOT NULL DEFAULT 'unknown',
  vibe            text NOT NULL DEFAULT 'unknown',
  link            text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  created_at      double precision NOT NULL,
  updated_at      double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS candidates_room_idx ON candidates(room_id);

-- (card_id, member_id, round) 기본키로 1인 1표를 DB 차원에서 보장
CREATE TABLE IF NOT EXISTS votes (
  card_id         text NOT NULL REFERENCES decision_cards(id) ON DELETE CASCADE,
  member_id       text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  round           integer NOT NULL,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  candidate_id    text NOT NULL,
  created_at      double precision NOT NULL,
  PRIMARY KEY (card_id, member_id, round)
);
CREATE INDEX IF NOT EXISTS votes_room_idx ON votes(room_id);

CREATE TABLE IF NOT EXISTS battle_entries (
  card_id           text NOT NULL REFERENCES decision_cards(id) ON DELETE CASCADE,
  member_id         text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  round             integer NOT NULL,
  room_id           text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  taps              integer NOT NULL DEFAULT 0,
  last_accepted_at  double precision,
  PRIMARY KEY (card_id, member_id, round)
);
CREATE INDEX IF NOT EXISTS battle_room_idx ON battle_entries(room_id);

-- (card_id, round) 기본키로 같은 라운드의 중복 결과 생성을 막는다
CREATE TABLE IF NOT EXISTS decision_results (
  card_id         text NOT NULL REFERENCES decision_cards(id) ON DELETE CASCADE,
  round           integer NOT NULL,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  mode            text NOT NULL,
  candidate       jsonb NOT NULL,                 -- 확정 당시 후보 스냅샷
  reasons         jsonb NOT NULL DEFAULT '[]'::jsonb,
  detail          jsonb NOT NULL,
  created_at      double precision NOT NULL,
  confirmed_at    double precision,
  PRIMARY KEY (card_id, round)
);
CREATE INDEX IF NOT EXISTS results_room_idx ON decision_results(room_id);

-- ───── 회원 계정 (선택) ─────
-- 가입하지 않아도 모임은 그대로 쓸 수 있다. 가입하면 참가자(members)를 계정에 연결해
-- 다른 기기에서 로그인해도 같은 참가자로 이어서 쓸 수 있다.
CREATE TABLE IF NOT EXISTS users (
  id              text PRIMARY KEY,
  username        text NOT NULL UNIQUE,          -- 소문자로 정규화해서 저장
  password_hash   text NOT NULL,                 -- scrypt$N$r$p$salt$hash (원문 저장 안 함)
  created_at      double precision NOT NULL
);

-- 로그인 세션. 쿠키에는 무작위 토큰, DB에는 해시만 저장
CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash      text PRIMARY KEY,
  user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      double precision NOT NULL,
  expires_at      double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);

ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE SET NULL;
-- 한 계정은 한 모임에 참가자 한 명만 (NULL인 비회원 참가자는 제한 없음)
CREATE UNIQUE INDEX IF NOT EXISTS members_room_user_idx ON members(room_id, user_id);

-- 로그인으로 다른 기기에서 들어올 때 발급하는 추가 참여 토큰 (기존 기기의 토큰은 그대로 유효)
CREATE TABLE IF NOT EXISTS member_tokens (
  token_hash      text PRIMARY KEY,
  member_id       text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_at      double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS member_tokens_member_idx ON member_tokens(member_id);
-- 후보의 '기타' 입력 내용 (비용·특징·실내/야외·분위기). 예: {"cost": "메뉴마다 달라요"}
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS notes jsonb NOT NULL DEFAULT '{}'::jsonb;
-- 결정 카드 일정: 몇 일차(1부터) · 시작 시각(HH:MM). 비어 있으면 일정표에서 맨 뒤로
ALTER TABLE decision_cards ADD COLUMN IF NOT EXISTS day integer;
ALTER TABLE decision_cards ADD COLUMN IF NOT EXISTS start_time text;
-- 결정 카드 아이콘 (방장이 목록에서 고름). 비어 있으면 제목으로 추측한 아이콘
ALTER TABLE decision_cards ADD COLUMN IF NOT EXISTS icon text;
-- 구슬 레이스 움직임 기록. 서버가 한 번 계산해 저장하고, 모든 참가자가 같은 기록을 재생한다
CREATE TABLE IF NOT EXISTS marble_races (
  card_id         text NOT NULL REFERENCES decision_cards(id) ON DELETE CASCADE,
  round           integer NOT NULL,
  room_id         text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  data            jsonb NOT NULL,                -- MarbleRace (맵·이름·프레임·도착 순서)
  starts_at       double precision NOT NULL,     -- 서버 시각 기준 출발 (카운트다운 뒤)
  ends_at         double precision NOT NULL,     -- 재생이 끝나 결과를 공개하는 시각
  PRIMARY KEY (card_id, round)
);-- 프로필: 모임을 만들거나 참여할 때 미리 채워 줄 기본 닉네임·캐릭터·색 (비어 있으면 아이디와 기본 캐릭터)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS character text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS color text;
-- 비밀번호 재설정용 복구 코드의 해시 (원문은 만들 때 한 번만 보여주고 저장하지 않음). 한 번 쓰면 지운다
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_hash text;
