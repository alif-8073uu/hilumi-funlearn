CREATE TABLE public.password_reset_attempts (email text PRIMARY KEY, failures int NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.password_reset_attempts TO service_role;
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;