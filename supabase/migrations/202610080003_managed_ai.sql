-- Private job queue: the VPS connects outbound to Supabase. No public AI port.
create table public.ai_worker_status (
 id boolean primary key default true check(id),
 last_seen timestamptz not null default now()
);
create table public.ai_analysis_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 image_base64 text,
 status text not null default 'queued' check(status in ('queued','processing','completed','failed')),
 result jsonb,
 error text,
 lease_token uuid,
 lease_until timestamptz,
 created_at timestamptz not null default now(),
 finished_at timestamptz
);
create index ai_jobs_pending on public.ai_analysis_jobs(created_at) where status='queued';
alter table public.ai_worker_status enable row level security;
alter table public.ai_analysis_jobs enable row level security;
revoke all on public.ai_worker_status,public.ai_analysis_jobs from anon,authenticated;
grant all on public.ai_worker_status,public.ai_analysis_jobs to service_role;

create function public.ai_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_allowed_google_user() then raise exception 'Masuk dengan akun Google yang terdaftar' using errcode='42501'; end if;
 return jsonb_build_object('available',exists(select 1 from public.ai_worker_status where last_seen > now()-interval '45 seconds'));
end $$;

create function public.queue_food_analysis(image text, request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.ai_analysis_jobs;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses analisis ditolak' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 select * into existing from public.ai_analysis_jobs where id=request_id;
 if existing.id is not null then
   if existing.user_id<>auth.uid() then raise exception 'Akses analisis ditolak' using errcode='42501'; end if;
   return existing.id;
 end if;
 if not exists(select 1 from public.ai_worker_status where last_seen>now()-interval '45 seconds') then
   raise exception 'Analisis foto sedang tidak tersedia. Coba lagi sebentar.';
 end if;
 if image is null or length(image) not between 8 and 6000000
    or image !~ '^/9j/[A-Za-z0-9+/]*={0,2}$' then raise exception 'Foto JPEG tidak valid atau terlalu besar'; end if;
 if exists(select 1 from public.ai_analysis_jobs where user_id=auth.uid()
   and ((status in ('queued','processing') and created_at>now()-interval '5 minutes') or created_at>now()-interval '5 seconds')) then
   raise exception 'Analisis sebelumnya masih berjalan. Tunggu sebentar.';
 end if;
 insert into public.ai_analysis_jobs(id,user_id,image_base64) values(request_id,auth.uid(),image);
 return request_id;
end $$;

create function public.food_analysis_result(job_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare job public.ai_analysis_jobs;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses analisis ditolak' using errcode='42501'; end if;
 select * into job from public.ai_analysis_jobs where id=job_id and user_id=auth.uid();
 if job.id is null then raise exception 'Analisis tidak ditemukan' using errcode='42501'; end if;
 return jsonb_build_object('status',job.status,'result',job.result,'error',job.error);
end $$;

-- Only the server worker can claim/finish jobs or update its heartbeat.
create function public.ai_worker_heartbeat() returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.ai_worker_status(id,last_seen) values(true,now()) on conflict(id) do update set last_seen=excluded.last_seen;
 update public.ai_analysis_jobs set status='failed',image_base64=null,error='Analisis terlalu lama. Silakan coba lagi.',finished_at=now()
 where (status='queued' and created_at<now()-interval '5 minutes')
    or (status='processing' and lease_until<now());
 delete from public.ai_analysis_jobs where created_at<now()-interval '1 hour';
end $$;
create function public.claim_food_analysis() returns jsonb
language plpgsql security definer set search_path='' as $$
declare job public.ai_analysis_jobs;
begin
 select * into job from public.ai_analysis_jobs where status='queued' order by created_at for update skip locked limit 1;
 if job.id is null then return null; end if;
 update public.ai_analysis_jobs set status='processing',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
 where id=job.id returning * into job;
 return jsonb_build_object('id',job.id,'image',job.image_base64,'lease_token',job.lease_token);
end $$;
create function public.finish_food_analysis(job_id uuid, lease uuid, analysis jsonb default null, failure text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.ai_analysis_jobs set status=case when analysis is null then 'failed' else 'completed' end,
 result=analysis,error=left(failure,300),image_base64=null,finished_at=now()
 where id=job_id and status='processing' and lease_token=lease and lease_until>now();
 if not found then raise exception 'Lease analisis tidak valid' using errcode='42501'; end if;
end $$;
revoke all on function public.ai_status(),public.queue_food_analysis(text,uuid),public.food_analysis_result(uuid),
 public.ai_worker_heartbeat(),public.claim_food_analysis(),public.finish_food_analysis(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.ai_status(),public.queue_food_analysis(text,uuid),public.food_analysis_result(uuid) to authenticated;
grant execute on function public.ai_worker_heartbeat(),public.claim_food_analysis(),public.finish_food_analysis(uuid,uuid,jsonb,text) to service_role;
