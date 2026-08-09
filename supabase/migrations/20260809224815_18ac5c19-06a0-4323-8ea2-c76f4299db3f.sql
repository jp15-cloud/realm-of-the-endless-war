CREATE OR REPLACE FUNCTION public.heal_tick()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_hp integer;
BEGIN
  UPDATE public.profiles
    SET hp = least(max_hp, hp + 5), online_at = now()
    WHERE id = auth.uid() AND hp < max_hp
    RETURNING hp INTO new_hp;
  RETURN coalesce(new_hp, 0);
END; $$;

REVOKE EXECUTE ON FUNCTION public.heal_tick() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.heal_tick() TO authenticated;