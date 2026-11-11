CREATE TABLE public.streak_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.streak_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX streak_messages_group_idx ON public.streak_messages (group_id, created_at DESC);
GRANT SELECT, INSERT ON public.streak_messages TO authenticated;
GRANT ALL ON public.streak_messages TO service_role;
ALTER TABLE public.streak_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_members_read ON public.streak_messages FOR SELECT TO authenticated
  USING (public.is_streak_member(group_id));
CREATE POLICY chat_members_send ON public.streak_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.streak_members m WHERE m.group_id = streak_messages.group_id AND m.user_id = auth.uid() AND m.accepted));
ALTER PUBLICATION supabase_realtime ADD TABLE public.streak_messages;