-- Reuse the private worker queue for deterministic calorie plans + AI explanations.
alter table public.ai_analysis_jobs add column kind text not null default 'food' check(kind in ('food','calorie_plan'));
alter table public.ai_analysis_jobs add column profile_payload jsonb;

create function public.queue_calorie_plan(profile jsonb, request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.ai_analysis_jobs; birth date; years integer;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses perhitungan ditolak' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into existing from public.ai_analysis_jobs where id=request_id;
 if existing.id is not null then
  if existing.user_id<>auth.uid() or existing.kind<>'calorie_plan' then raise exception 'Akses perhitungan ditolak' using errcode='42501'; end if;
  return existing.id;
 end if;
 if not exists(select 1 from public.ai_worker_status where last_seen>now()-interval '45 seconds') then
  raise exception 'Perhitungan AI sedang tidak tersedia. Coba lagi sebentar.';
 end if;
 if profile is null or jsonb_typeof(profile)<>'object' or length(profile::text)>2000
  or not (profile ?& array['birthDate','sex','height','weight','targetWeight','activity'])
  or jsonb_typeof(profile->'sex')<>'string'
  or profile->>'sex' not in ('male','female')
  or jsonb_typeof(profile->'birthDate')<>'string'
  or profile->>'birthDate' !~ '^\d{4}-\d{2}-\d{2}$'
  or jsonb_typeof(profile->'height')<>'number' or jsonb_typeof(profile->'weight')<>'number'
  or jsonb_typeof(profile->'targetWeight')<>'number' or jsonb_typeof(profile->'activity')<>'number'
  then raise exception 'Data tubuh belum valid'; end if;
 begin
  birth:=(profile->>'birthDate')::date;
 exception when others then raise exception 'Tanggal lahir tidak valid'; end;
 years:=extract(year from age((now() at time zone 'Asia/Jakarta')::date,birth));
 if years not between 18 and 100 then raise exception 'Perhitungan untuk usia 18–100 tahun'; end if;
 if (profile->>'height')::numeric not between 100 and 250
  or (profile->>'weight')::numeric not between 30 and 350
  or (profile->>'targetWeight')::numeric not between 30 and 350
  or (profile->>'activity')::numeric not in (1.2,1.375,1.55,1.725)
  then raise exception 'Ukuran tubuh atau aktivitas tidak valid'; end if;
 if profile ? 'bio' and (jsonb_typeof(profile->'bio')<>'string' or length(profile->>'bio')>300)
  then raise exception 'Bio maksimal 300 karakter'; end if;
 if profile ? 'requiresClinicalPlan' and jsonb_typeof(profile->'requiresClinicalPlan')<>'boolean'
  then raise exception 'Kebutuhan nutrisi belum valid'; end if;
 if coalesce((profile->>'requiresClinicalPlan')::boolean,false)
  then raise exception 'Kebutuhan nutrisi khusus perlu rencana dari tenaga kesehatan'; end if;
 if (profile->>'targetWeight')::numeric < (profile->>'weight')::numeric
  and (profile->>'targetWeight')::numeric / power((profile->>'height')::numeric/100,2)<18.5
  then raise exception 'Target penurunan berat terlalu rendah'; end if;
 if exists(select 1 from public.ai_analysis_jobs where user_id=auth.uid()
  and ((status in ('queued','processing') and created_at>now()-interval '5 minutes') or created_at>now()-interval '5 seconds'))
  then raise exception 'Analisis sebelumnya masih berjalan. Tunggu sebentar.'; end if;
 insert into public.ai_analysis_jobs(id,user_id,kind,profile_payload)
 values(request_id,auth.uid(),'calorie_plan',jsonb_build_object(
  'birthDate',profile->'birthDate','sex',profile->'sex','height',profile->'height','weight',profile->'weight',
  'targetWeight',profile->'targetWeight','activity',profile->'activity','bio',coalesce(profile->'bio','""'::jsonb)));
 return request_id;
end $$;

create or replace function public.claim_food_analysis() returns jsonb
language plpgsql security definer set search_path='' as $$
declare job public.ai_analysis_jobs;
begin
 select * into job from public.ai_analysis_jobs where status='queued' order by created_at for update skip locked limit 1;
 if job.id is null then return null; end if;
 update public.ai_analysis_jobs set status='processing',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
 where id=job.id returning * into job;
 return jsonb_build_object('id',job.id,'kind',job.kind,'image',job.image_base64,'profile',job.profile_payload,'lease_token',job.lease_token);
end $$;
create or replace function public.finish_food_analysis(job_id uuid, lease uuid, analysis jsonb default null, failure text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.ai_analysis_jobs set status=case when analysis is null then 'failed' else 'completed' end,
 result=analysis,error=left(failure,300),image_base64=null,profile_payload=null,finished_at=now()
 where id=job_id and status='processing' and lease_token=lease and lease_until>now();
 if not found then raise exception 'Lease analisis tidak valid' using errcode='42501'; end if;
end $$;
create or replace function public.ai_worker_heartbeat() returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.ai_worker_status(id,last_seen) values(true,now()) on conflict(id) do update set last_seen=excluded.last_seen;
 update public.ai_analysis_jobs set status='failed',image_base64=null,profile_payload=null,error='Analisis terlalu lama. Silakan coba lagi.',finished_at=now()
 where (status='queued' and created_at<now()-interval '5 minutes') or (status='processing' and lease_until<now());
 delete from public.ai_analysis_jobs where created_at<now()-interval '1 hour';
end $$;
revoke all on function public.queue_calorie_plan(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.queue_calorie_plan(jsonb,uuid) to authenticated;
