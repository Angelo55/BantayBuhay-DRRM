-- Supabase publishes tables in public through its Data API to the anon and authenticated roles.
-- BantayBuhay doesn't use the Data API: every read and write goes through the Node API, which
-- checks roles and writes the audit log. So every table has row level security turned on with
-- no policies for those roles, and their grants are removed. On plain Postgres (tests) the
-- roles don't exist, and only the RLS part applies.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'sessions', 'responder_profiles', 'civilian_profiles', 'incidents',
    'incident_events', 'assignments', 'audit_logs', 'barangays', 'cameras', 'detections'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated';
  END IF;
END
$$;
