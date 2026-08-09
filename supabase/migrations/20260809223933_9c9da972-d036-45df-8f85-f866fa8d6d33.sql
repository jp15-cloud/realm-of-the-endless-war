-- 1. Clans
CREATE TABLE public.clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tag text NOT NULL,
  leader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renown integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clans TO authenticated;
GRANT ALL ON public.clans TO service_role;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view clans" ON public.clans FOR SELECT TO authenticated USING (true);
CREATE TRIGGER clans_set_updated_at BEFORE UPDATE ON public.clans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. World state on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pos_x double precision NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS pos_y double precision NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS hp integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_hp integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deaths integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS clan_id uuid REFERENCES public.clans(id) ON DELETE SET NULL;

CREATE POLICY "Players can view all characters" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 3. Resource nodes
CREATE TABLE public.resource_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  x double precision NOT NULL,
  y double precision NOT NULL,
  amount integer NOT NULL DEFAULT 100,
  max_amount integer NOT NULL DEFAULT 100,
  respawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resource_nodes TO authenticated;
GRANT ALL ON public.resource_nodes TO service_role;
ALTER TABLE public.resource_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view nodes" ON public.resource_nodes FOR SELECT TO authenticated USING (true);
CREATE TRIGGER resource_nodes_set_updated_at BEFORE UPDATE ON public.resource_nodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Territories
CREATE TABLE public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  x double precision NOT NULL,
  y double precision NOT NULL,
  radius double precision NOT NULL DEFAULT 220,
  owner_clan_id uuid REFERENCES public.clans(id) ON DELETE SET NULL,
  captured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.territories TO authenticated;
GRANT ALL ON public.territories TO service_role;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view territories" ON public.territories FOR SELECT TO authenticated USING (true);
CREATE TRIGGER territories_set_updated_at BEFORE UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Game actions
CREATE OR REPLACE FUNCTION public.harvest_node(_node_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n public.resource_nodes; p public.profiles; take integer;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.id IS NULL THEN RAISE EXCEPTION 'No character'; END IF;
  SELECT * INTO n FROM public.resource_nodes WHERE id = _node_id FOR UPDATE;
  IF n.id IS NULL THEN RAISE EXCEPTION 'No node'; END IF;
  IF sqrt(power(n.x - p.pos_x, 2) + power(n.y - p.pos_y, 2)) > 90 THEN RAISE EXCEPTION 'Too far'; END IF;
  IF n.amount <= 0 THEN RAISE EXCEPTION 'Depleted'; END IF;
  take := least(5 + p.level, n.amount);
  UPDATE public.resource_nodes SET amount = amount - take,
    respawn_at = CASE WHEN amount - take <= 0 THEN now() + interval '45 seconds' ELSE respawn_at END
    WHERE id = n.id;
  UPDATE public.profiles SET
    ore = ore + CASE WHEN n.kind = 'ore' THEN take ELSE 0 END,
    bloodwood = bloodwood + CASE WHEN n.kind = 'bloodwood' THEN take ELSE 0 END,
    relics = relics + CASE WHEN n.kind = 'relic' THEN 1 ELSE 0 END,
    experience = experience + take * 2,
    level = greatest(level, floor((experience + take * 2) / 1000)::int + 1),
    online_at = now()
  WHERE id = p.id;
  RETURN json_build_object('kind', n.kind, 'amount', take);
END; $$;

CREATE OR REPLACE FUNCTION public.attack_player(_target_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.profiles; t public.profiles; dmg integer; died boolean := false;
BEGIN
  SELECT * INTO a FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO t FROM public.profiles WHERE id = _target_id FOR UPDATE;
  IF a.id IS NULL OR t.id IS NULL OR a.id = t.id THEN RAISE EXCEPTION 'Invalid target'; END IF;
  IF a.hp <= 0 THEN RAISE EXCEPTION 'You are dead'; END IF;
  IF t.hp <= 0 THEN RAISE EXCEPTION 'Target is dead'; END IF;
  IF sqrt(power(t.pos_x - a.pos_x, 2) + power(t.pos_y - a.pos_y, 2)) > 110 THEN RAISE EXCEPTION 'Out of range'; END IF;
  dmg := 6 + a.level * 2 + floor(random() * 6)::int;
  IF t.hp - dmg <= 0 THEN died := true; END IF;
  IF died THEN
    UPDATE public.profiles SET hp = max_hp, deaths = deaths + 1, pos_x = 1000, pos_y = 1000,
      ore = floor(ore * 0.8)::int, bloodwood = floor(bloodwood * 0.8)::int WHERE id = t.id;
    UPDATE public.profiles SET kills = kills + 1, renown = renown + 25, gold = gold + 50,
      experience = experience + 300, level = greatest(level, floor((experience + 300) / 1000)::int + 1),
      online_at = now() WHERE id = a.id;
    IF a.clan_id IS NOT NULL THEN UPDATE public.clans SET renown = renown + 25 WHERE id = a.clan_id; END IF;
  ELSE
    UPDATE public.profiles SET hp = hp - dmg WHERE id = t.id;
    UPDATE public.profiles SET online_at = now() WHERE id = a.id;
  END IF;
  RETURN json_build_object('damage', dmg, 'killed', died);
END; $$;

CREATE OR REPLACE FUNCTION public.slay_mob(_mob_level integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; xp integer; lvl integer;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.id IS NULL THEN RAISE EXCEPTION 'No character'; END IF;
  lvl := greatest(1, least(coalesce(_mob_level, 1), 50));
  xp := 40 + lvl * 20;
  UPDATE public.profiles SET experience = experience + xp,
    level = greatest(level, floor((experience + xp) / 1000)::int + 1),
    gold = gold + lvl * 5, renown = renown + 2, online_at = now()
  WHERE id = p.id;
  RETURN json_build_object('xp', xp);
END; $$;

CREATE OR REPLACE FUNCTION public.take_damage(_amount integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; dmg integer; died boolean := false;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'No character'; END IF;
  dmg := greatest(0, least(coalesce(_amount, 0), 60));
  IF p.hp - dmg <= 0 THEN
    died := true;
    UPDATE public.profiles SET hp = max_hp, deaths = deaths + 1, pos_x = 1000, pos_y = 1000 WHERE id = p.id;
  ELSE
    UPDATE public.profiles SET hp = hp - dmg WHERE id = p.id;
  END IF;
  RETURN json_build_object('died', died);
END; $$;

CREATE OR REPLACE FUNCTION public.create_clan(_name text, _tag text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF length(trim(_name)) < 3 THEN RAISE EXCEPTION 'Clan name too short'; END IF;
  INSERT INTO public.clans (name, tag, leader_id)
  VALUES (trim(_name), upper(left(trim(_tag), 4)), auth.uid()) RETURNING id INTO new_id;
  UPDATE public.profiles SET clan_id = new_id, clan = trim(_name) WHERE id = auth.uid();
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.join_clan(_clan_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.clans;
BEGIN
  SELECT * INTO c FROM public.clans WHERE id = _clan_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'No such clan'; END IF;
  UPDATE public.profiles SET clan_id = c.id, clan = c.name WHERE id = auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.capture_territory(_territory_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; t public.territories;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO t FROM public.territories WHERE id = _territory_id FOR UPDATE;
  IF p.id IS NULL OR t.id IS NULL THEN RAISE EXCEPTION 'Invalid'; END IF;
  IF p.clan_id IS NULL THEN RAISE EXCEPTION 'Join a clan first'; END IF;
  IF t.owner_clan_id = p.clan_id THEN RAISE EXCEPTION 'Already yours'; END IF;
  IF sqrt(power(t.x - p.pos_x, 2) + power(t.y - p.pos_y, 2)) > t.radius THEN RAISE EXCEPTION 'Not inside territory'; END IF;
  UPDATE public.territories SET owner_clan_id = p.clan_id, captured_at = now() WHERE id = t.id;
  UPDATE public.clans SET renown = renown + 100 WHERE id = p.clan_id;
  UPDATE public.profiles SET renown = renown + 40, experience = experience + 500,
    level = greatest(level, floor((experience + 500) / 1000)::int + 1) WHERE id = p.id;
  RETURN json_build_object('name', t.name);
END; $$;

CREATE OR REPLACE FUNCTION public.respawn_nodes()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.resource_nodes SET amount = max_amount, respawn_at = NULL
  WHERE amount <= 0 AND respawn_at IS NOT NULL AND respawn_at < now();
$$;

-- 6. Realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.resource_nodes REPLICA IDENTITY FULL;
ALTER TABLE public.territories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.territories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clans;

-- 7. Seed world
INSERT INTO public.territories (name, x, y, radius) VALUES
  ('Ashfall Keep', 400, 400, 240),
  ('Ironmoor Quarry', 1600, 500, 220),
  ('The Hollow Reach', 500, 1600, 220),
  ('Emberwatch Spire', 1700, 1650, 240),
  ('Cinder Crossroads', 1000, 1000, 200);

INSERT INTO public.resource_nodes (kind, x, y, amount, max_amount)
SELECT
  (ARRAY['ore','bloodwood','relic'])[1 + (i % 3)],
  200 + ((i * 137) % 1700)::double precision,
  200 + ((i * 289) % 1700)::double precision,
  CASE WHEN i % 3 = 2 THEN 20 ELSE 100 END,
  CASE WHEN i % 3 = 2 THEN 20 ELSE 100 END
FROM generate_series(0, 71) AS i;