CREATE TABLE lesson_assessment_jobs (
 id text PRIMARY KEY NOT NULL,
 session_id text NOT NULL REFERENCES lesson_sessions(id),
 owner_account_id text NOT NULL,
 request_id text NOT NULL,
 fingerprint text NOT NULL,
 status text NOT NULL,
 result text,
 created_at integer NOT NULL,
 updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_lesson_assessment_request ON lesson_assessment_jobs(session_id,owner_account_id,request_id);
