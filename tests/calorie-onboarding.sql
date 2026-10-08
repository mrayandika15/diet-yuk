\ir ../supabase/migrations/202610080004_calorie_onboarding.sql
-- A logged-in allowed user may calculate a target before saving a profile.
delete from public.profiles where id='00000000-0000-4000-8000-000000000001';
delete from public.ai_analysis_jobs;
set role service_role;
select public.ai_worker_heartbeat();
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.queue_calorie_plan('{"birthDate":"2000-01-01","sex":"male","height":170,"weight":70,"targetWeight":65,"activity":1.375,"bio":"Kerja duduk, jalan sore.","calorieTarget":500}', '60000000-0000-4000-8000-000000000001');
select public.queue_calorie_plan('{}', '60000000-0000-4000-8000-000000000001');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ declare profile jsonb='{"birthDate":"2000-01-01","sex":"female","height":160,"weight":60,"targetWeight":55,"activity":1.375}'; bad jsonb; begin
 begin
  perform public.food_analysis_result('60000000-0000-4000-8000-000000000001'); raise exception 'Partner can read onboarding job';
 exception when insufficient_privilege then null; end;
 begin
  perform public.queue_calorie_plan(profile,'60000000-0000-4000-8000-000000000001'); raise exception 'Partner can reuse job';
 exception when insufficient_privilege then null; end;
 for bad in select v from (values ('{"height":null}'::jsonb),('{"sex":null}'),('{"activity":2}'),('{"birthDate":"2000-02-31"}'),('{"targetWeight":30}'),('{"requiresClinicalPlan":true}'),('{"weight":"60"}')) as x(v) loop
  begin
   perform public.queue_calorie_plan(profile || bad,gen_random_uuid());
   raise exception 'Invalid onboarding data accepted';
  exception when raise_exception then if sqlerrm='Invalid onboarding data accepted' then raise; end if; end;
 end loop;
end $$;
reset role;
set role service_role;
do $$ declare job jsonb; begin
 job:=public.claim_food_analysis();
 if job->>'kind'<>'calorie_plan' or job->'profile'->>'bio'<>'Kerja duduk, jalan sore.' then raise exception 'Missing onboarding payload'; end if;
 if job->'profile' ? 'calorieTarget' then raise exception 'Client supplied target passed through'; end if;
 perform public.finish_food_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,'{"calorieTarget":1914}');
 if exists(select 1 from public.ai_analysis_jobs where profile_payload is not null) then raise exception 'Raw bio retained after finish'; end if;
 insert into public.ai_analysis_jobs(user_id,kind,profile_payload,created_at) values('00000000-0000-4000-8000-000000000001','calorie_plan','{"bio":"expired private bio"}',now()-interval '6 minutes');
 perform public.ai_worker_heartbeat();
 if exists(select 1 from public.ai_analysis_jobs where profile_payload is not null) then raise exception 'Expired bio retained'; end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin perform public.queue_calorie_plan('{}',gen_random_uuid()); raise exception 'Anonymous onboarding accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Calorie onboarding validation, privacy and pre-profile queue checks passed' as result;
