-- Mail Guard · controles de privacidad (idempotente).
-- Permite a cada usuario borrar su propio historial desde el panel.

drop policy if exists "Users can delete their own scans" on public.mail_scans;
create policy "Users can delete their own scans" on public.mail_scans
  for delete to authenticated using ((select auth.uid()) = profile_id);

-- Borra los análisis y las métricas agregadas del usuario autenticado.
-- security definer porque profile_analytics no tiene política de borrado;
-- auth.uid() limita el alcance al propio usuario (NULL → no borra nada).
create or replace function public.delete_my_history()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.mail_scans where profile_id = auth.uid();
  get diagnostics removed = row_count;
  delete from public.profile_analytics where profile_id = auth.uid();
  return removed;
end;
$$;

revoke all on function public.delete_my_history() from public;
grant execute on function public.delete_my_history() to authenticated;
