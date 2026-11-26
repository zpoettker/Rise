-- Rise: let signed-in users reach the tables (Stage 4).
--
-- Newer Supabase projects don't grant table access to the API roles by
-- default, so even a signed-in account would get "permission denied".
-- Row-level security (initial schema) still limits every account to its own
-- rows; this only opens the door for the `authenticated` role.
-- Signed-out visitors (`anon`) get nothing.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.wake_logs,
  public.workouts,
  public.work_sessions,
  public.weights,
  public.custom_days
to authenticated;

-- tokens are only listed and revoked from the app (created server-side)
grant select, delete on public.api_tokens to authenticated;
