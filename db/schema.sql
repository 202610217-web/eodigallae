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
