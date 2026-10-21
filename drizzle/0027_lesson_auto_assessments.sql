ALTER TABLE lesson_assessment_jobs ADD COLUMN mode text NOT NULL DEFAULT 'legacy';
--> statement-breakpoint
ALTER TABLE lesson_assessment_jobs ADD COLUMN source_fingerprint text;
--> statement-breakpoint
ALTER TABLE lesson_assessment_jobs ADD COLUMN task_set_fingerprint text;
--> statement-breakpoint
ALTER TABLE lesson_assessment_jobs ADD COLUMN provider_model text;
--> statement-breakpoint
ALTER TABLE lesson_assessment_jobs ADD COLUMN audit_receipt text;
--> statement-breakpoint
ALTER TABLE lesson_assessment_jobs ADD COLUMN error_code text;
--> statement-breakpoint
CREATE INDEX idx_lesson_assessment_mode ON lesson_assessment_jobs(session_id, owner_account_id, mode, updated_at);
