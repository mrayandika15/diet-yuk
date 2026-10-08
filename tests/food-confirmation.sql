\ir ../supabase/migrations/202610080005_food_confirmation.sql
delete from public.ai_analysis_jobs;
insert into public.ai_analysis_jobs(id,user_id,status,result,created_at) values
 ('70000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','completed',
 '{"items":[{"name":"Telur rebus","portion_g":55,"calories":85,"protein_g":7,"carbs_g":1,"fat_g":6}],"questions":[{"id":"egg","item_index":0,"kind":"egg_type","text":"Jenis telur?","options":[{"id":"omega","label":"Omega"},{"id":"regular","label":"Biasa"}]}]}',now()-interval '10 seconds');
set role service_role;
select public.ai_worker_heartbeat();
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
 begin perform public.queue_food_refinement('70000000-0000-4000-8000-000000000001','{"egg":"omega"}',gen_random_uuid());
  raise exception 'Partner refined private photo'; exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ declare invalid jsonb; begin
 for invalid in select v from (values ('{}'::jsonb), ('{"egg":"unlisted"}'), ('{"invented":"omega"}'), ('{"egg":null}')) x(v) loop
  begin perform public.queue_food_refinement('70000000-0000-4000-8000-000000000001',invalid,gen_random_uuid());
   raise exception 'Invalid answer accepted'; exception when raise_exception then if sqlerrm='Invalid answer accepted' then raise; end if; end;
 end loop;
end $$;
select public.queue_food_refinement('70000000-0000-4000-8000-000000000001','{"egg":"omega"}','70000000-0000-4000-8000-000000000002');
select public.queue_food_refinement('70000000-0000-4000-8000-000000000001','{}','70000000-0000-4000-8000-000000000002');
do $$ begin
 begin perform public.claim_food_analysis(); raise exception 'Client claimed private answers'; exception when insufficient_privilege then null; end;
 begin perform profile_payload from public.ai_analysis_jobs; raise exception 'Direct answers access'; exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
 begin perform public.queue_food_refinement('70000000-0000-4000-8000-000000000001','{"egg":"omega"}','70000000-0000-4000-8000-000000000002');
  raise exception 'Partner reused refinement ID'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ declare job jsonb; begin
 job:=public.claim_food_analysis();
 if job->>'kind'<>'food_refinement' or job->'profile'->'answers'->>'egg'<>'omega' then raise exception 'Missing answers'; end if;
 if job->'profile'->'original'->'items'->0->>'name'<>'Telur rebus' then raise exception 'Base result not passed'; end if;
 perform public.finish_food_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,'{"items":[],"questions":[]}');
 if exists(select 1 from public.ai_analysis_jobs where profile_payload is not null) then raise exception 'Completed answers retained'; end if;
 insert into public.ai_analysis_jobs(user_id,kind,profile_payload,created_at) values('00000000-0000-4000-8000-000000000001','food_refinement','{"answers":"expired"}',now()-interval '6 minutes');
 perform public.ai_worker_heartbeat();
 if exists(select 1 from public.ai_analysis_jobs where profile_payload is not null) then raise exception 'Expired answers retained'; end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin perform public.queue_food_refinement(gen_random_uuid(),'{}',gen_random_uuid()); raise exception 'Anonymous refined food'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Food confirmation ownership, choices, idempotency and privacy checks passed' as result;
