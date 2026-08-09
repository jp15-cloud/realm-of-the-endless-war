REVOKE EXECUTE ON FUNCTION public.harvest_node(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.attack_player(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.slay_mob(integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.take_damage(integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.create_clan(text, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.join_clan(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.capture_territory(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.respawn_nodes() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.harvest_node(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attack_player(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.slay_mob(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.take_damage(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clan(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_clan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_territory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respawn_nodes() TO authenticated;