CREATE TABLE site_trash (
  kind text NOT NULL,
  object_id text NOT NULL,
  owner_account_id text NOT NULL REFERENCES accounts(id),
  deleted_at integer NOT NULL,
  data text NOT NULL DEFAULT '{}',
  PRIMARY KEY(kind,object_id)
);
--> statement-breakpoint
CREATE INDEX idx_site_trash_owner ON site_trash(owner_account_id,deleted_at);
