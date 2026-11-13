CREATE TABLE public.site_visits (id bigint generated always as identity primary key, visited_at timestamptz not null default now());
GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can log a visit" ON public.site_visits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX site_visits_visited_at_idx ON public.site_visits (visited_at);