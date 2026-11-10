-- Sign-up no longer verifies email, so an old account may be restored only when email ownership is proven:
-- a Google identity with the same email, or a session opened from an emailed one-time link.
CREATE OR REPLACE FUNCTION public.claim_legacy_profile() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  my_email text;
  proven boolean;
  l public.legacy_users;
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  SELECT lower(email) INTO my_email FROM auth.users WHERE id = me;
  IF my_email IS NULL THEN RETURN false; END IF;

  proven := EXISTS (
      SELECT 1 FROM auth.identities i
      WHERE i.user_id = me AND i.provider = 'google' AND lower(i.identity_data->>'email') = my_email
    )
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
      WHERE a->>'method' IN ('otp', 'magiclink', 'recovery')
    );
  IF NOT proven THEN RETURN false; END IF;

  SELECT * INTO l FROM public.legacy_users WHERE lower(email) = my_email AND claimed_by IS NULL FOR UPDATE;
  IF l.legacy_id IS NULL THEN RETURN false; END IF;

  UPDATE public.profiles SET
    nick = coalesce(l.nick, nick),
    lumi_id = coalesce(l.lumi_id, lumi_id),
    progress = coalesce(l.progress, progress),
    updated_at = now()
  WHERE id = me;

  UPDATE public.streak_groups SET creator_id = me WHERE creator_id = l.legacy_id;
  UPDATE public.shared_quizzes SET inviter_id = me WHERE inviter_id = l.legacy_id;
  UPDATE public.streak_members m SET user_id = me WHERE m.user_id = l.legacy_id
    AND NOT EXISTS (SELECT 1 FROM public.streak_members x WHERE x.group_id = m.group_id AND x.user_id = me);
  UPDATE public.shared_quiz_players p SET user_id = me WHERE p.user_id = l.legacy_id
    AND NOT EXISTS (SELECT 1 FROM public.shared_quiz_players x WHERE x.quiz_id = p.quiz_id AND x.user_id = me);

  UPDATE public.legacy_users SET claimed_by = me, claimed_at = now() WHERE legacy_id = l.legacy_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_legacy_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_legacy_profile() TO authenticated;