-- A function with a fixed search path can't be redirected to look-alike objects in another schema.
ALTER FUNCTION reject_audit_change() SET search_path = '';
