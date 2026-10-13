DO $$ BEGIN
  CREATE TYPE board_visibility AS ENUM ('private', 'workspace', 'public');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS visibility board_visibility NOT NULL DEFAULT 'workspace';
