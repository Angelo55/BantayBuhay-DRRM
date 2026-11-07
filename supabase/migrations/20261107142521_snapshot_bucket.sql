-- Private bucket for camera snapshots. Only the API writes and reads it, with the service-role
-- key; browsers get snapshots through the API's audited endpoint, never from Storage directly.
-- The 512 KB limit matches the API's own check. Plain Postgres (tests) has no storage schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('snapshots', 'snapshots', false, 524288, ARRAY['image/jpeg'])
    ON CONFLICT (id) DO UPDATE
      SET public = false, file_size_limit = 524288, allowed_mime_types = ARRAY['image/jpeg'];
  END IF;
END
$$;
