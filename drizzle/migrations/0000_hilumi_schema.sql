CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nick text NOT NULL DEFAULT 'Pelajar',
  lumi_id text NOT NULL DEFAULT ('#LUMI-' || (1000 + floor(random()*9000))::int),
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nick)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'nick', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1), 'Pelajar'), 20))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.streak_groups (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, creator_id uuid NOT NULL, streak_count integer NOT NULL DEFAULT 0, last_completed_day date, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.streak_groups TO authenticated; GRANT ALL ON public.streak_groups TO service_role;
ALTER TABLE public.streak_groups ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.streak_members (group_id uuid NOT NULL REFERENCES public.streak_groups(id), user_id uuid NOT NULL, accepted boolean NOT NULL DEFAULT false, PRIMARY KEY(group_id,user_id));
GRANT SELECT ON public.streak_members TO authenticated; GRANT ALL ON public.streak_members TO service_role;
ALTER TABLE public.streak_members ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_streak_member(g uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.streak_members WHERE group_id=g AND user_id=auth.uid()) $$;
REVOKE ALL ON FUNCTION public.is_streak_member(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.is_streak_member(uuid) TO authenticated;
CREATE POLICY member_group_read ON public.streak_groups FOR SELECT TO authenticated USING(public.is_streak_member(id));
CREATE POLICY member_roster_read ON public.streak_members FOR SELECT TO authenticated USING(public.is_streak_member(group_id));
CREATE TABLE public.shared_quizzes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES public.streak_groups(id), inviter_id uuid NOT NULL, title text NOT NULL, questions jsonb NOT NULL, minutes integer NOT NULL DEFAULT 10, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now()+interval '24 hours'), credited boolean NOT NULL DEFAULT false);
GRANT SELECT(id,group_id,inviter_id,title,minutes,created_at,expires_at,credited) ON public.shared_quizzes TO authenticated; GRANT ALL ON public.shared_quizzes TO service_role;
ALTER TABLE public.shared_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_members_read ON public.shared_quizzes FOR SELECT TO authenticated USING(public.is_streak_member(group_id));
CREATE TABLE public.shared_quiz_players (quiz_id uuid NOT NULL REFERENCES public.shared_quizzes(id), user_id uuid NOT NULL, started_at timestamptz, completed_at timestamptz, points integer NOT NULL DEFAULT 0, correct integer NOT NULL DEFAULT 0, PRIMARY KEY(quiz_id,user_id));
GRANT SELECT ON public.shared_quiz_players TO authenticated; GRANT ALL ON public.shared_quiz_players TO service_role;
ALTER TABLE public.shared_quiz_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_roster_read ON public.shared_quiz_players FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.shared_quizzes q WHERE q.id=quiz_id AND public.is_streak_member(q.group_id)));
CREATE FUNCTION public.streak_directory(term text) RETURNS TABLE(id uuid,nick text,lumi_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF; RETURN QUERY SELECT p.id,p.nick,p.lumi_id FROM public.profiles p WHERE p.id<>auth.uid() AND length(trim(term))>=2 AND (p.nick ILIKE '%'||left(term,40)||'%' OR p.lumi_id ILIKE '%'||left(term,40)||'%') LIMIT 20; END $$;
CREATE FUNCTION public.create_streak_group(label text, members uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE g uuid; u uuid; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF; IF length(trim(label)) NOT BETWEEN 1 AND 60 OR cardinality(members)<1 OR cardinality(members)>19 THEN RAISE EXCEPTION 'Choose members and a group name'; END IF; IF EXISTS(SELECT 1 FROM unnest(members) m WHERE m=auth.uid() OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=m)) THEN RAISE EXCEPTION 'Invalid member'; END IF; INSERT INTO public.streak_groups(name,creator_id) VALUES(trim(label),auth.uid()) RETURNING id INTO g; INSERT INTO public.streak_members VALUES(g,auth.uid(),true); FOREACH u IN ARRAY members LOOP INSERT INTO public.streak_members VALUES(g,u,false) ON CONFLICT DO NOTHING; END LOOP; RETURN g; END $$;
CREATE FUNCTION public.accept_streak_group(g uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN UPDATE public.streak_members SET accepted=true WHERE group_id=g AND user_id=auth.uid(); IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF; END $$;
CREATE FUNCTION public.invite_streak_quiz(g uuid,label text,qs jsonb,duration integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE qid uuid; BEGIN PERFORM 1 FROM public.streak_groups WHERE id=g FOR UPDATE; IF NOT EXISTS(SELECT 1 FROM public.streak_members WHERE group_id=g AND user_id=auth.uid() AND accepted) OR EXISTS(SELECT 1 FROM public.streak_members WHERE group_id=g AND NOT accepted) THEN RAISE EXCEPTION 'All members must accept the group invitation first'; END IF; IF EXISTS(SELECT 1 FROM public.shared_quizzes WHERE group_id=g AND expires_at>now() AND NOT credited) THEN RAISE EXCEPTION 'An invitation is still active'; END IF; IF duration NOT BETWEEN 1 AND 60 OR jsonb_typeof(qs)<>'array' OR jsonb_array_length(qs) NOT BETWEEN 1 AND 75 THEN RAISE EXCEPTION 'Invalid quiz'; END IF; IF EXISTS(SELECT 1 FROM jsonb_array_elements(qs) x WHERE jsonb_typeof(x->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(x->'options')<>4 OR (x->>'answer')::integer NOT BETWEEN 0 AND 3) THEN RAISE EXCEPTION 'Invalid questions'; END IF; INSERT INTO public.shared_quizzes(group_id,inviter_id,title,questions,minutes) VALUES(g,auth.uid(),left(label,100),qs,duration) RETURNING id INTO qid; INSERT INTO public.shared_quiz_players(quiz_id,user_id) SELECT qid,user_id FROM public.streak_members WHERE group_id=g; RETURN qid; END $$;
CREATE FUNCTION public.start_streak_quiz(qid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q public.shared_quizzes; started timestamptz; BEGIN SELECT * INTO q FROM public.shared_quizzes WHERE id=qid; IF q.id IS NULL OR q.expires_at<=now() THEN RAISE EXCEPTION 'Invitation expired'; END IF; UPDATE public.shared_quiz_players SET started_at=coalesce(started_at,now()) WHERE quiz_id=qid AND user_id=auth.uid() AND completed_at IS NULL RETURNING started_at INTO started; IF started IS NULL THEN RAISE EXCEPTION 'Quiz unavailable'; END IF; RETURN jsonb_build_object('questions',(SELECT jsonb_agg(x-'answer'-'explain') FROM jsonb_array_elements(q.questions) x),'seconds', greatest(0,least(q.minutes*60,floor(extract(epoch FROM (q.expires_at-now())))::integer)-floor(extract(epoch FROM(now()-started)))::integer)); END $$;
CREATE FUNCTION public.finish_streak_quiz(qid uuid,answers jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q public.shared_quizzes; player public.shared_quiz_players; n integer:=0; idx integer:=0; x jsonb; complete boolean; day date:=(now() AT TIME ZONE 'Asia/Jakarta')::date; BEGIN SELECT * INTO q FROM public.shared_quizzes WHERE id=qid FOR UPDATE; SELECT * INTO player FROM public.shared_quiz_players WHERE quiz_id=qid AND user_id=auth.uid() FOR UPDATE; IF player.user_id IS NULL OR player.started_at IS NULL THEN RAISE EXCEPTION 'Join the invitation first'; END IF; IF player.completed_at IS NOT NULL THEN RETURN jsonb_build_object('correct',player.correct,'points',player.points,'credited',q.credited); END IF; IF q.expires_at<=now() OR now()>player.started_at+make_interval(mins=>q.minutes)+interval '30 seconds' THEN RAISE EXCEPTION 'Quiz time expired'; END IF; IF jsonb_typeof(answers)<>'array' OR jsonb_array_length(answers)>jsonb_array_length(q.questions) THEN RAISE EXCEPTION 'Invalid answers'; END IF; FOR x IN SELECT * FROM jsonb_array_elements(q.questions) LOOP IF (answers->>idx)::integer=(x->>'answer')::integer THEN n:=n+1; END IF; idx:=idx+1; END LOOP; UPDATE public.shared_quiz_players SET completed_at=now(),points=n*10,correct=n WHERE quiz_id=qid AND user_id=auth.uid(); SELECT NOT EXISTS(SELECT 1 FROM public.shared_quiz_players WHERE quiz_id=qid AND completed_at IS NULL) INTO complete; IF complete AND NOT q.credited THEN UPDATE public.streak_groups SET streak_count=CASE WHEN last_completed_day=day THEN streak_count WHEN last_completed_day=day-1 THEN streak_count+1 ELSE 1 END,last_completed_day=day WHERE id=q.group_id; UPDATE public.shared_quizzes SET credited=true WHERE id=qid; END IF; RETURN jsonb_build_object('correct',n,'points',n*10,'credited',complete,'questions',q.questions); END $$;
CREATE FUNCTION public.streak_member_names(g uuid) RETURNS TABLE(id uuid,nick text,lumi_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_streak_member(g) THEN RAISE EXCEPTION 'Forbidden'; END IF; RETURN QUERY SELECT p.id,p.nick,p.lumi_id FROM public.profiles p JOIN public.streak_members m ON p.id=m.user_id WHERE m.group_id=g; END $$;
REVOKE ALL ON FUNCTION public.streak_directory(text),public.create_streak_group(text,uuid[]),public.accept_streak_group(uuid),public.invite_streak_quiz(uuid,text,jsonb,integer),public.start_streak_quiz(uuid),public.finish_streak_quiz(uuid,jsonb),public.streak_member_names(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.streak_directory(text),public.create_streak_group(text,uuid[]),public.accept_streak_group(uuid),public.invite_streak_quiz(uuid,text,jsonb,integer),public.start_streak_quiz(uuid),public.finish_streak_quiz(uuid,jsonb),public.streak_member_names(uuid) TO authenticated;

-- Migration support: imported users from the previous app, claimed after verified email ownership.
CREATE TABLE public.legacy_users (
  legacy_id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  nick text,
  lumi_id text,
  progress jsonb,
  claimed_by uuid UNIQUE,
  claimed_at timestamptz
);
GRANT ALL ON public.legacy_users TO service_role;
ALTER TABLE public.legacy_users ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.claim_legacy_profile() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  my_email text;
  confirmed timestamptz;
  l public.legacy_users;
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  SELECT lower(email), email_confirmed_at INTO my_email, confirmed FROM auth.users WHERE id = me;
  IF my_email IS NULL OR confirmed IS NULL THEN RETURN false; END IF;
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