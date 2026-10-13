CREATE TABLE IF NOT EXISTS board_automations (
  id BIGSERIAL PRIMARY KEY,
  board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  trigger_type VARCHAR(40) NOT NULL CHECK (trigger_type IN ('card_created', 'card_moved')),
  trigger_list_id BIGINT REFERENCES lists(id) ON DELETE CASCADE,
  action_type VARCHAR(40) NOT NULL CHECK (action_type IN ('mark_complete', 'move_to_list')),
  action_list_id BIGINT REFERENCES lists(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS board_automations_board_idx ON board_automations(board_id, enabled);
