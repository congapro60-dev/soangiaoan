ALTER TABLE exam_attempts ADD COLUMN extra_minutes INTEGER NOT NULL DEFAULT 0 CONSTRAINT exam_attempt_extra_minutes CHECK(typeof(extra_minutes)='integer' AND extra_minutes BETWEEN 0 AND 60);
--> statement-breakpoint
ALTER TABLE exam_attempts ADD COLUMN text_scale REAL NOT NULL DEFAULT 1 CONSTRAINT exam_attempt_text_scale CHECK(text_scale IN (1,1.25,1.5,1.75,2));
--> statement-breakpoint
ALTER TABLE exam_attempts ADD COLUMN accommodation_revision INTEGER NOT NULL DEFAULT 0 CONSTRAINT exam_attempt_accommodation_revision CHECK(typeof(accommodation_revision)='integer' AND accommodation_revision>=0);
