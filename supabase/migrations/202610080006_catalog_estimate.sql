-- Nutritional estimates for pictured selections from the live TheMealDB API.
alter table public.ai_analysis_jobs drop constraint ai_analysis_jobs_kind_check;
alter table public.ai_analysis_jobs add constraint ai_analysis_jobs_kind_check
 check(kind in ('food','calorie_plan','food_refinement','food_catalog'));

create function public.queue_catalog_estimate(selection jsonb, request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.ai_analysis_jobs;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses analisis ditolak' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into existing from public.ai_analysis_jobs where id=request_id;
 if existing.id is not null then
  if existing.user_id<>auth.uid() or existing.kind<>'food_catalog' then raise exception 'Akses analisis ditolak' using errcode='42501'; end if;
  return existing.id;
 end if;
 if selection is null or jsonb_typeof(selection)<>'object' or length(selection::text)>700
  or not(selection ?& array['kind','id','preparation'])
  or jsonb_typeof(selection->'kind')<>'string' or selection->>'kind' not in ('meal','ingredient')
  or jsonb_typeof(selection->'id')<>'string' or length(selection->>'id') not between 1 and 100
  or jsonb_typeof(selection->'preparation')<>'string'
  or selection->>'preparation' not in ('as_listed','boiled','fried','grilled','steamed','raw')
  or (selection->>'kind'='meal' and (selection->>'id' !~ '^\d{1,8}$' or selection->>'preparation'<>'as_listed'))
  then raise exception 'Pilihan menu belum valid'; end if;
 if not exists(select 1 from public.ai_worker_status where last_seen>now()-interval '45 seconds') then
  raise exception 'Perhitungan sedang tidak tersedia. Coba lagi sebentar.';
 end if;
 if exists(select 1 from public.ai_analysis_jobs where user_id=auth.uid()
  and ((status in ('queued','processing') and created_at>now()-interval '5 minutes') or created_at>now()-interval '5 seconds'))
  then raise exception 'Analisis sebelumnya masih berjalan. Tunggu sebentar.'; end if;
 insert into public.ai_analysis_jobs(id,user_id,kind,profile_payload)
 values(request_id,auth.uid(),'food_catalog',jsonb_build_object('kind',selection->'kind','id',selection->'id','preparation',selection->'preparation'));
 return request_id;
end $$;
revoke all on function public.queue_catalog_estimate(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.queue_catalog_estimate(jsonb,uuid) to authenticated;
