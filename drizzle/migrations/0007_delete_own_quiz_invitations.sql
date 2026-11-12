ALTER TABLE public.shared_quiz_players DROP CONSTRAINT IF EXISTS shared_quiz_players_quiz_id_fkey;
ALTER TABLE public.shared_quiz_players
  ADD CONSTRAINT shared_quiz_players_quiz_id_fkey
  FOREIGN KEY (quiz_id) REFERENCES public.shared_quizzes(id) ON DELETE CASCADE;

GRANT DELETE ON public.shared_quizzes TO authenticated;

CREATE POLICY quiz_inviter_delete ON public.shared_quizzes
  FOR DELETE TO authenticated
  USING (inviter_id = auth.uid());