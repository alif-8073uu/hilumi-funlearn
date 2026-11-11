ALTER TABLE public.shared_quiz_players ADD COLUMN answered integer NOT NULL DEFAULT 0;

CREATE TABLE public.shared_quiz_answers (
  quiz_id uuid NOT NULL REFERENCES public.shared_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  idx integer NOT NULL,
  choice integer NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quiz_id, user_id, idx)
);
GRANT ALL ON public.shared_quiz_answers TO service_role;
ALTER TABLE public.shared_quiz_answers ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.shared_quiz_answers IS 'Per-question answers; read/written only through security-definer quiz RPCs so choices stay private.';

CREATE FUNCTION public.answer_streak_quiz(qid uuid, i integer, choice integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.shared_quizzes; player public.shared_quiz_players; x jsonb; ok boolean; prev public.shared_quiz_answers;
BEGIN
  SELECT * INTO q FROM public.shared_quizzes WHERE id = qid;
  SELECT * INTO player FROM public.shared_quiz_players WHERE quiz_id = qid AND user_id = auth.uid() FOR UPDATE;
  IF q.id IS NULL OR player.user_id IS NULL OR player.started_at IS NULL THEN RAISE EXCEPTION 'Join the invitation first'; END IF;
  IF player.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Quiz already finished'; END IF;
  IF q.expires_at <= now() OR now() > player.started_at + make_interval(mins => q.minutes) + interval '30 seconds' THEN RAISE EXCEPTION 'Quiz time expired'; END IF;
  IF i < 0 OR i >= jsonb_array_length(q.questions) OR choice NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Invalid answer'; END IF;
  x := q.questions -> i;
  SELECT * INTO prev FROM public.shared_quiz_answers WHERE quiz_id = qid AND user_id = auth.uid() AND idx = i;
  IF prev.quiz_id IS NULL THEN
    ok := choice = (x ->> 'answer')::integer;
    INSERT INTO public.shared_quiz_answers (quiz_id, user_id, idx, choice, is_correct) VALUES (qid, auth.uid(), i, choice, ok);
    UPDATE public.shared_quiz_players SET answered = answered + 1, correct = correct + ok::integer, points = points + CASE WHEN ok THEN 10 ELSE 0 END
      WHERE quiz_id = qid AND user_id = auth.uid();
  ELSE
    ok := prev.is_correct; choice := prev.choice;
  END IF;
  RETURN jsonb_build_object('correct', ok, 'choice', choice, 'answer', (x ->> 'answer')::integer, 'explain', x ->> 'explain');
END $$;

CREATE OR REPLACE FUNCTION public.finish_streak_quiz(qid uuid, answers jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.shared_quizzes; player public.shared_quiz_players; n integer := 0; idx integer := 0; x jsonb; complete boolean; stored integer; day date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  SELECT * INTO q FROM public.shared_quizzes WHERE id = qid FOR UPDATE;
  SELECT * INTO player FROM public.shared_quiz_players WHERE quiz_id = qid AND user_id = auth.uid() FOR UPDATE;
  IF player.user_id IS NULL OR player.started_at IS NULL THEN RAISE EXCEPTION 'Join the invitation first'; END IF;
  IF player.completed_at IS NOT NULL THEN RETURN jsonb_build_object('correct', player.correct, 'points', player.points, 'credited', q.credited); END IF;
  IF q.expires_at <= now() OR now() > player.started_at + make_interval(mins => q.minutes) + interval '2 minutes' THEN RAISE EXCEPTION 'Quiz time expired'; END IF;
  SELECT count(*) INTO stored FROM public.shared_quiz_answers WHERE quiz_id = qid AND user_id = auth.uid();
  IF stored > 0 THEN
    SELECT count(*) INTO n FROM public.shared_quiz_answers WHERE quiz_id = qid AND user_id = auth.uid() AND is_correct;
  ELSE
    IF jsonb_typeof(answers) <> 'array' OR jsonb_array_length(answers) > jsonb_array_length(q.questions) THEN RAISE EXCEPTION 'Invalid answers'; END IF;
    FOR x IN SELECT * FROM jsonb_array_elements(q.questions) LOOP
      IF jsonb_typeof(answers -> idx) = 'number' AND (answers ->> idx)::integer BETWEEN 0 AND 3 THEN
        INSERT INTO public.shared_quiz_answers (quiz_id, user_id, idx, choice, is_correct)
          VALUES (qid, auth.uid(), idx, (answers ->> idx)::integer, (answers ->> idx)::integer = (x ->> 'answer')::integer) ON CONFLICT DO NOTHING;
        IF (answers ->> idx)::integer = (x ->> 'answer')::integer THEN n := n + 1; END IF;
      END IF;
      idx := idx + 1;
    END LOOP;
    stored := idx;
  END IF;
  UPDATE public.shared_quiz_players SET completed_at = now(), points = n * 10, correct = n,
    answered = (SELECT count(*) FROM public.shared_quiz_answers WHERE quiz_id = qid AND user_id = auth.uid())
    WHERE quiz_id = qid AND user_id = auth.uid();
  SELECT NOT EXISTS (SELECT 1 FROM public.shared_quiz_players WHERE quiz_id = qid AND completed_at IS NULL) INTO complete;
  IF complete AND NOT q.credited THEN
    UPDATE public.streak_groups SET streak_count = CASE WHEN last_completed_day = day THEN streak_count WHEN last_completed_day = day - 1 THEN streak_count + 1 ELSE 1 END, last_completed_day = day WHERE id = q.group_id;
    UPDATE public.shared_quizzes SET credited = true WHERE id = qid;
  END IF;
  RETURN jsonb_build_object('correct', n, 'points', n * 10, 'credited', complete, 'questions', q.questions);
END $$;

CREATE FUNCTION public.review_streak_quiz(qid uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.shared_quizzes; player public.shared_quiz_players;
BEGIN
  SELECT * INTO q FROM public.shared_quizzes WHERE id = qid;
  SELECT * INTO player FROM public.shared_quiz_players WHERE quiz_id = qid AND user_id = auth.uid();
  IF q.id IS NULL OR player.user_id IS NULL OR player.completed_at IS NULL THEN RAISE EXCEPTION 'Finish the quiz first'; END IF;
  RETURN jsonb_build_object(
    'questions', q.questions,
    'picks', (SELECT jsonb_agg((SELECT to_jsonb(a.choice) FROM public.shared_quiz_answers a WHERE a.quiz_id = qid AND a.user_id = auth.uid() AND a.idx = g - 1) ORDER BY g)
              FROM generate_series(1, jsonb_array_length(q.questions)) g));
END $$;

REVOKE ALL ON FUNCTION public.answer_streak_quiz(uuid, integer, integer), public.review_streak_quiz(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.answer_streak_quiz(uuid, integer, integer), public.review_streak_quiz(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_quiz_players;