-- Optional answers use the same private, outbound-only worker queue.
-- profile_payload also carries food-refinement data and is erased by existing
-- finish/expiry RPCs. Clients cannot supply or read another user's base result.
alter table public.ai_analysis_jobs drop constraint ai_analysis_jobs_kind_check;
alter table public.ai_analysis_jobs add constraint ai_analysis_jobs_kind_check
 check(kind in ('food','calorie_plan','food_refinement'));

create function public.queue_food_refinement(original_job uuid, answers jsonb, request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.ai_analysis_jobs; original public.ai_analysis_jobs; answer record;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses analisis ditolak' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into existing from public.ai_analysis_jobs where id=request_id;
 if existing.id is not null then
  if existing.user_id<>auth.uid() or existing.kind<>'food_refinement' then raise exception 'Akses analisis ditolak' using errcode='42501'; end if;
  return existing.id;
 end if;
 select * into original from public.ai_analysis_jobs where id=original_job and user_id=auth.uid() and kind='food' and status='completed';
 if original.id is null then raise exception 'Hasil foto sudah tidak tersedia. Gunakan estimasi awal atau analisis ulang.' using errcode='42501'; end if;
 if answers is null or jsonb_typeof(answers)<>'object' or answers='{}'::jsonb or length(answers::text)>1000
  then raise exception 'Pilih jawaban konfirmasi terlebih dahulu'; end if;
 for answer in select * from jsonb_each(answers) loop
  if jsonb_typeof(answer.value)<>'string' or not exists(
   select 1 from jsonb_array_elements(coalesce(original.result->'questions','[]'::jsonb)) q,
    lateral jsonb_array_elements(q->'options') o
   where q->>'id'=answer.key and o->'id'=answer.value
  ) then raise exception 'Jawaban konfirmasi tidak valid'; end if;
 end loop;
 if not exists(select 1 from public.ai_worker_status where last_seen>now()-interval '45 seconds') then
  raise exception 'Analisis sedang tidak tersedia. Kamu bisa menggunakan estimasi awal.';
 end if;
 if exists(select 1 from public.ai_analysis_jobs where user_id=auth.uid()
  and ((status in ('queued','processing') and created_at>now()-interval '5 minutes') or created_at>now()-interval '5 seconds'))
  then raise exception 'Analisis sebelumnya masih berjalan. Tunggu sebentar.'; end if;
 insert into public.ai_analysis_jobs(id,user_id,kind,profile_payload)
 values(request_id,auth.uid(),'food_refinement',jsonb_build_object('original',original.result,'answers',answers));
 return request_id;
end $$;
revoke all on function public.queue_food_refinement(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.queue_food_refinement(uuid,jsonb,uuid) to authenticated;
