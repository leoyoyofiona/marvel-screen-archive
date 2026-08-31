export const schema = `
CREATE TABLE IF NOT EXISTS marvel_visitors (
 id TEXT PRIMARY KEY, first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_seen TIMESTAMPTZ NOT NULL DEFAULT now(), country TEXT, gender TEXT,
 profile_consent BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS marvel_likes (
 visitor_id TEXT NOT NULL REFERENCES marvel_visitors(id) ON DELETE CASCADE,
 work_id TEXT NOT NULL, liked BOOLEAN NOT NULL DEFAULT true,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(visitor_id,work_id)
);
CREATE TABLE IF NOT EXISTS marvel_comments (
 id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL REFERENCES marvel_visitors(id) ON DELETE CASCADE,
 work_id TEXT, name TEXT NOT NULL, body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ,
 CHECK(char_length(body) BETWEEN 2 AND 300), CHECK(char_length(name) BETWEEN 1 AND 24)
);
CREATE INDEX IF NOT EXISTS marvel_comments_public ON marvel_comments(status,work_id,created_at DESC);
CREATE TABLE IF NOT EXISTS marvel_rate_limits (
 bucket TEXT PRIMARY KEY, requests INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL
);
`;
