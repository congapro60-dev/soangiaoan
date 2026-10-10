ALTER TABLE exam_attempts ADD COLUMN review_pin_hash TEXT;
--> statement-breakpoint
ALTER TABLE exam_attempts ADD COLUMN review_fail_count INTEGER DEFAULT 0;
--> statement-breakpoint
ALTER TABLE exam_attempts ADD COLUMN review_window_start INTEGER;
--> statement-breakpoint
CREATE TABLE exam_review_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES exam_attempts(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_exam_review_token ON exam_review_sessions(token_hash);
--> statement-breakpoint
CREATE INDEX idx_exam_review_attempt ON exam_review_sessions(attempt_id,created_at);
