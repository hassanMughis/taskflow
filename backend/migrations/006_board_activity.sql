CREATE TABLE IF NOT EXISTS board_activities (
  id BIGSERIAL PRIMARY KEY,
  board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  card_id BIGINT REFERENCES cards(id) ON DELETE SET NULL,
  actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type VARCHAR(60) NOT NULL,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS board_activities_board_created_idx ON board_activities(board_id, created_at DESC);
