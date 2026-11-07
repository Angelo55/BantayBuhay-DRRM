-- Row level security that actually binds the API.
--
-- The API's login role (postgres on Supabase) bypasses RLS, so requests from signed-in users run
-- under bantaybuhay_app instead, which doesn't. At the start of each request the API runs
--   SET ROLE bantaybuhay_app;
--   SELECT set_config('app.user_id', <user id>, false), set_config('app.role', <role>, false);
-- and resets both before the connection returns to the pool. Login, session lookup, detector
-- ingest, live-update fan-out and seeding stay on the login role; that path is kept narrow.
--
-- Roles: admin and operator run operations; responders see only incidents they're actively
-- assigned to; civilians see only their own records. Medical records (milestone 5) will add a
-- policy readable by the owning civilian and by a responder assigned to that civilian's active
-- incident.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bantaybuhay_app') THEN
    CREATE ROLE bantaybuhay_app NOLOGIN NOBYPASSRLS NOINHERIT;
  END IF;
  -- The API's login role must be allowed to switch to it: postgres on Supabase, the test user elsewhere.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT bantaybuhay_app TO postgres;
  ELSE
    EXECUTE format('GRANT bantaybuhay_app TO %I', current_user);
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO bantaybuhay_app;

-- Who is asking, as set by the API for this connection. Empty outside a user request.
CREATE FUNCTION app_user_id() RETURNS uuid
  LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION app_role() RETURNS text
  LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(current_setting('app.role', true), '') $$;

CREATE FUNCTION app_is_operator() RETURNS boolean
  LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT public.app_role() IN ('admin', 'operator') $$;

-- Whether the current user is a responder actively assigned to an incident. Security definer,
-- so policies on assignments can use it without checking themselves recursively.
CREATE FUNCTION app_is_assigned(incident uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
  AS $$
    SELECT public.app_role() = 'responder' AND EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.incident_id = incident
        AND assignments.responder_id = public.app_user_id()
        AND assignments.released_at IS NULL)
  $$;

REVOKE ALL ON FUNCTION app_user_id(), app_role(), app_is_operator(), app_is_assigned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_user_id(), app_role(), app_is_operator(), app_is_assigned(uuid)
  TO bantaybuhay_app;

-- Table privileges: only what the API's routes do. Password hashes are never readable.
GRANT SELECT (id, email, full_name, role, disabled_at, created_at) ON users TO bantaybuhay_app;
GRANT SELECT, DELETE ON sessions TO bantaybuhay_app;
GRANT SELECT ON responder_profiles, civilian_profiles, barangays, cameras TO bantaybuhay_app;
GRANT SELECT, INSERT ON incidents, incident_events, audit_logs TO bantaybuhay_app;
GRANT UPDATE (status, resolved_at, acknowledged_at, acknowledged_by) ON incidents TO bantaybuhay_app;
GRANT SELECT, INSERT ON assignments TO bantaybuhay_app;
GRANT UPDATE (released_at) ON assignments TO bantaybuhay_app;
GRANT SELECT ON detections TO bantaybuhay_app;
GRANT UPDATE (review_status, incident_id, reviewed_by, reviewed_at) ON detections TO bantaybuhay_app;
GRANT USAGE ON SEQUENCE audit_logs_id_seq TO bantaybuhay_app;

-- users: operations staff see everyone; responders see staff and other responders (names on
-- shared incidents); everyone sees themselves.
CREATE POLICY users_read ON users FOR SELECT TO bantaybuhay_app
  USING (app_is_operator() OR id = app_user_id()
         OR (app_role() = 'responder' AND role IN ('admin', 'operator', 'responder')));

-- sessions: your own, for signing out.
CREATE POLICY sessions_own ON sessions FOR ALL TO bantaybuhay_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());

CREATE POLICY responder_profiles_read ON responder_profiles FOR SELECT TO bantaybuhay_app
  USING (app_is_operator() OR user_id = app_user_id());

-- Operators can find civilians (SOS linking, QR medical ID); a civilian sees their own.
CREATE POLICY civilian_profiles_read ON civilian_profiles FOR SELECT TO bantaybuhay_app
  USING (app_is_operator() OR user_id = app_user_id());

CREATE POLICY barangays_read ON barangays FOR SELECT TO bantaybuhay_app USING (true);

CREATE POLICY cameras_read ON cameras FOR SELECT TO bantaybuhay_app
  USING (app_role() IN ('admin', 'operator', 'responder'));

-- incidents: operators do everything the routes allow; a responder sees and updates only the
-- incidents they're actively assigned to.
CREATE POLICY incidents_operators ON incidents FOR ALL TO bantaybuhay_app
  USING (app_is_operator()) WITH CHECK (app_is_operator());
CREATE POLICY incidents_responder_read ON incidents FOR SELECT TO bantaybuhay_app
  USING (app_is_assigned(id));
CREATE POLICY incidents_responder_update ON incidents FOR UPDATE TO bantaybuhay_app
  USING (app_is_assigned(id)) WITH CHECK (app_role() = 'responder');

-- incident history: written under your own name only.
CREATE POLICY incident_events_operators ON incident_events FOR ALL TO bantaybuhay_app
  USING (app_is_operator()) WITH CHECK (app_is_operator() AND actor_id = app_user_id());
CREATE POLICY incident_events_responder_read ON incident_events FOR SELECT TO bantaybuhay_app
  USING (app_is_assigned(incident_id));
CREATE POLICY incident_events_responder_write ON incident_events FOR INSERT TO bantaybuhay_app
  WITH CHECK (app_is_assigned(incident_id) AND actor_id = app_user_id());

-- assignments: operators assign; a responder sees the team on their incidents and can release
-- assignments when closing one.
CREATE POLICY assignments_operators ON assignments FOR ALL TO bantaybuhay_app
  USING (app_is_operator()) WITH CHECK (app_is_operator());
-- A new assignment is always recorded under the operator who made it.
CREATE POLICY assignments_assigned_by_self ON assignments AS RESTRICTIVE FOR INSERT TO bantaybuhay_app
  WITH CHECK (assigned_by = app_user_id());
CREATE POLICY assignments_responder_read ON assignments FOR SELECT TO bantaybuhay_app
  USING (responder_id = app_user_id() OR app_is_assigned(incident_id));
CREATE POLICY assignments_responder_release ON assignments FOR UPDATE TO bantaybuhay_app
  USING (app_is_assigned(incident_id)) WITH CHECK (app_role() = 'responder');

-- detections: operators review; a responder sees those attached to their incidents (snapshots).
CREATE POLICY detections_operators ON detections FOR ALL TO bantaybuhay_app
  USING (app_is_operator()) WITH CHECK (app_is_operator());
CREATE POLICY detections_responder_read ON detections FOR SELECT TO bantaybuhay_app
  USING (app_is_assigned(incident_id));

-- audit log: anyone signed in can add entries under their own name; only admins read it.
-- Updates and deletes are already refused by the append-only trigger.
CREATE POLICY audit_logs_write ON audit_logs FOR INSERT TO bantaybuhay_app
  WITH CHECK (actor_id = app_user_id());
CREATE POLICY audit_logs_admin_read ON audit_logs FOR SELECT TO bantaybuhay_app
  USING (app_role() = 'admin');
